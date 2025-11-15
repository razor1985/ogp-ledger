/**
 * @razor1985/ogp-ledger
 * -------------------------------------------------
 * OGP Ledger v3.6 — Minerless Blockchain with PBFT/Raft Consensus
 * Integrated with:
 *   @razor1985/ogp-fabricController
 *   @razor1985/ogp-ledgerdb
 */

import logger from "./utils/logger.js";
import { loadConfig } from "./config/fabric.js";
import { configValidate } from "./utils/configValidate.js";

import { Blockchain } from "./core/blockchain.js";
import { LedgerServer } from "./ledgerServer.js";

import { PBFT } from "./consensus/pbft.js";
import { PBFTView } from "./consensus/PBFTView.js";
import { Raft } from "./consensus/raft.js";

import { setupPBFTListeners } from "./pbft/handler.js";
import { CircuitBreaker } from "./utils/CircuitBreaker.js";

import {
  LedgerDBService,
  FabricReplicator35,
  WatchtowerHooks,
} from "@razor1985/ogp-ledgerdb";

import { MetricsCollector } from "./utils/metrics.js";
import { keyManager } from "./crypto/keyManager.js";
import { KeyRotationManager } from "./security/KeyRotationManager.js";

/*** 🔐 FabricController (Primary Fabric Node Control) ***/
import { FabricController } from "@razor1985/ogp-fabric-controller";

/* -----------------------------------------------------------
 * MODE + CONSENSUS
 * ----------------------------------------------------------- */
const CONSENSUS_MODE = (process.env.CONSENSUS_MODE || "pbft").toLowerCase();
const MODE = process.env.MODE || "dev";
const HEADLESS = process.env.HEADLESS === "true";

/* -----------------------------------------------------------
 * Startup Runner
 * ----------------------------------------------------------- */
(async () => {
  logger.info(
    `🚀 Launching OGP Ledger Node [mode=${MODE}, consensus=${CONSENSUS_MODE}]`
  );

  /* -----------------------------------------------------------
   * 1️⃣ Load + validate config
   * ----------------------------------------------------------- */
  const config = loadConfig();
  configValidate(config);
  logger.info(`✅ Loaded config for org=${config.orgId}, region=${config.region}`);

  /* -----------------------------------------------------------
   * 2️⃣ Circuit Breaker (patched API compatible)
   * ----------------------------------------------------------- */
  const nodeCircuit = new CircuitBreaker({
    failureThreshold: 3,
    recoveryTime: 10_000,
  });

  const guardedInit = async (label, fn) => {
    if (!nodeCircuit.canRequest()) throw new Error(`Circuit OPEN — skipping ${label}`);

    try {
      await fn();
      nodeCircuit.recordSuccess();
    } catch (err) {
      nodeCircuit.recordFailure();
      logger.error(`❌ ${label} failed: ${err.message}`);

      if (!nodeCircuit.canRequest())
        throw new Error(`Circuit OPEN — aborting startup at ${label}`);
    }
  };

  /* -----------------------------------------------------------
   * 3️⃣ Initialize FabricController (MOST IMPORTANT PART)
   * ----------------------------------------------------------- */

  let fabric;
  await guardedInit("FabricController Init", async () => {
    fabric = new FabricController({
      orgId: config.orgId,
      region: config.region,
      mode: MODE,
      brokerUrl: config.brokerUrl || "ws://localhost:8090",
      transport: "ws",

      /* Signing Keys */
      privateKeyPath: config.privateKeyPath,
      publicKeyPath: config.publicKeyPath,
      previousKeyPath: config.previousKeyPath,
      fabricKeyDir: config.fabricKeyDir || "./keys",
      networkId: config.networkId,
    });

    await fabric.start();
    logger.info("🌐 FabricController online (fabric ready + signed)");
  });

  /* -----------------------------------------------------------
   * 4️⃣ LedgerDB Init
   * ----------------------------------------------------------- */
  let ledgerDB;
  await guardedInit("LedgerDB Init", async () => {
    ledgerDB = new LedgerDBService({
      adapter: process.env.ADAPTER || "postgres",
      orgId: config.orgId,
      region: config.region,
      mode: MODE,
    });

    await ledgerDB.connect();
    logger.info("💾 LedgerDB connected");
  });

  /* -----------------------------------------------------------
   * 5️⃣ Key Rotation
   * ----------------------------------------------------------- */
  await guardedInit("Key Rotation Manager", async () => {
    const keyRotation = new KeyRotationManager(fabric.identity, {
      keyDir: config.keyDir || "./keys",
    });
    await keyRotation.init();
    logger.info(`🔐 Key rotation active for ${config.orgId}`);
  });

  /* -----------------------------------------------------------
   * 6️⃣ Fabric Replicator 3.5 (Incoming Ledger Events)
   * ----------------------------------------------------------- */
  let replicator;
  await guardedInit("Fabric Replicator", async () => {
    replicator = new FabricReplicator35({
      orgId: config.orgId,
      region: config.region,
      ledgerDB,
    });

    await replicator.start();
    logger.info("🔁 FabricReplicator35 active");
  });

  /* -----------------------------------------------------------
   * 7️⃣ Blockchain Instance (recover or create genesis)
   * ----------------------------------------------------------- */
  const chain = new Blockchain({ ledgerDB, orgId: config.orgId });

  const recovered = await chain.recoverFromSnapshot();
  if (!recovered) {
    logger.warn("⚠️ Snapshot not found — creating genesis");
    await chain.createGenesisBlock();
  }
  logger.info(`📜 Blockchain ready (height=${chain.getLatestBlock()?.index || 0})`);

  /* -----------------------------------------------------------
   * 8️⃣ Ledger Server (Wallet + Tx processing)
   * ----------------------------------------------------------- */
  const ledgerServer = HEADLESS
    ? null
    : new LedgerServer({
        orgId: config.orgId,
        privateKey: keyManager.getPrivateKey(),
        peers: fabric.nodeDirectory?.list() || [],
        consensus: CONSENSUS_MODE.toUpperCase(),
        chain,
      });

  if (ledgerServer) logger.info("🛰️ LedgerServer initialized");

  /* -----------------------------------------------------------
   * 9️⃣ Telemetry & Metrics
   * ----------------------------------------------------------- */
  const watchtower = new WatchtowerHooks(config.orgId, config.region);
  const metrics = new MetricsCollector();

  /* -----------------------------------------------------------
   * 🔟 Consensus Engine Setup (PBFT or Raft)
   * ----------------------------------------------------------- */
  let consensus;
  await guardedInit("Consensus Engine", async () => {
    if (CONSENSUS_MODE === "pbft") {
      consensus = new PBFT(fabric, chain, new PBFTView(config.orgId));
      await setupPBFTListeners(consensus);
      logger.info("⚙️ PBFT consensus online");
    } else {
      consensus = new Raft(fabric, chain);
      await consensus.start();
      logger.info("⚙️ Raft consensus online");
    }
  });

  /* -----------------------------------------------------------
   * 1️⃣1️⃣ Warm-Up Transaction
   * ----------------------------------------------------------- */
  await ledgerServer?.processTransaction(
    {
      from: "system",
      to: "system",
      amount: 0,
      ts: Date.now(),
      internal: true,
    },
    "internal"
  );

  logger.info("💸 Warm-up transaction processed");

  /* -----------------------------------------------------------
   * 🧩 Diagnostics
   * ----------------------------------------------------------- */
  const latestBlock = chain.getLatestBlock();
  if (latestBlock) {
    watchtower.push({
      blockId: latestBlock.blockId,
      orgId: config.orgId,
    });
  }

  metrics.increment("blocks_committed");

  logger.info("✅ OGP Ledger Node fully initialized (Stage 3.6)");

  if (HEADLESS) {
    logger.info("🔍 Headless mode enabled — telemetry only");
  }
})();
