/**
 * @razor1985/ogp-ledger
 * -------------------------------------------------
 * OGP Ledger v3.6 — Minerless Blockchain with PBFT/Raft Consensus
 * Integrated with @razor1985/ogp-fabricController + @razor1985/ogp-ledgerdb
 */

import { fabric } from "./fabric/broker.js";
import { setupPBFTListeners } from "./pbft/handler.js";
import { Blockchain } from "./core/blockchain.js";
import { LedgerServer } from "./ledgerServer.js";
import logger from "./utils/logger.js";
import { loadConfig } from "./config/fabric.js";
import { PBFT } from "./consensus/pbft.js";
import { Raft } from "./consensus/raft.js";
import { PBFTView } from "./consensus/PBFTView.js";
import { CircuitBreaker } from "./utils/CircuitBreaker.js";
import {
  LedgerDBService,
  FabricReplicator35,
  WatchtowerHooks,
} from "@razor1985/ogp-ledgerdb";
import { MetricsCollector } from "./utils/metrics.js";
import { configValidate } from "./utils/configValidate.js";
import { keyManager } from "./crypto/keyManager.js";
import { KeyRotationManager } from "./security/KeyRotationManager.js";

/* -----------------------------------------------------------
 * SDK Exports
 * ----------------------------------------------------------- */
export { Block } from "./core/block.js";
export { TxValidator } from "./core/TxValidator.js";
export { PBFT } from "./consensus/pbft.js";
export { PBFTView } from "./consensus/PBFTView.js";
export { KeyStore } from "./crypto/KeyStore.js";
export { CircuitBreaker } from "./utils/CircuitBreaker.js";
export { sanitizeMessage, Deduper } from "./utils/MessageGuard.js";
export { metrics } from "./utils/metrics.js";
export * as merkle from "./utils/merkle.js";
export { Blockchain } from "./core/blockchain.js";

/* -----------------------------------------------------------
 * Runtime Entrypoint
 * ----------------------------------------------------------- */

const CONSENSUS_MODE = (process.env.CONSENSUS_MODE || "pbft").toLowerCase();
const MODE = process.env.MODE || "dev";
const HEADLESS = process.env.HEADLESS === "true";

(async () => {
  logger.info(`🚀 Launching OGP Ledger Node [mode=${MODE}, consensus=${CONSENSUS_MODE}]`);

  /* 1️⃣ Load + validate config */
  const config = loadConfig();
  configValidate(config);
  logger.info(`✅ Loaded config for org=${config.orgId}, region=${config.region}`);

  /* 2️⃣ Circuit Breaker (patched API) */
  const nodeCircuit = new CircuitBreaker({
    failThreshold: 3,
    resetMs: 10000,
  });

  const guardedInit = async (label, fn) => {
    if (!nodeCircuit.canRequest()) {
      throw new Error(`Circuit OPEN — skipping ${label}`);
    }
    try {
      await fn();
      nodeCircuit.success();
    } catch (err) {
      nodeCircuit.fail();
      logger.error(`❌ ${label} failed: ${err.message}`);
      if (!nodeCircuit.canRequest()) {
        throw new Error(`Circuit OPEN — aborting startup at ${label}`);
      }
    }
  };

  /* 3️⃣ LedgerDB Initialization */
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

  /* 4️⃣ Fabric Node */
  await guardedInit("Fabric Broker", async () => {
    await fabric.connect();
    await fabric.register({
      org: config.orgId,
      service: "ledger-validator",
      version: "3.6.0",
      endpoints: [
        "pbft.prepare",
        "pbft.commit",
        "ledger.alert",
        "replication.event",
      ],
    });
    logger.info("🌐 Fabric registered and active");
  });

  /* 4.5 — Key Rotation */
  await guardedInit("Key Rotation Manager", async () => {
    const keyRotation = new KeyRotationManager(fabric, { keyDir: "./keys" });
    await keyRotation.init();
    logger.info(`🔐 Key rotation active for ${config.orgId}`);
  });

  /* 5️⃣ Multi-Region Replicator */
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

  /* 6️⃣ Blockchain Instance */
  const chain = new Blockchain({
    ledgerDB,
    orgId: config.orgId,
  });

  if (!(await chain.recoverFromSnapshot())) {
    logger.warn("⚠️ Snapshot not found — creating genesis");
    await chain.createGenesisBlock();
  }
  logger.info(`📜 Blockchain ready (height=${chain.getLatestBlock()?.index || 0})`);

  /* 7️⃣ Ledger Server */
  const ledgerServer = HEADLESS
    ? null
    : new LedgerServer({
        orgId: config.orgId,
        privateKey: keyManager.getPrivateKey(),
        peers: fabric.getPeers?.() || [],
        consensus: CONSENSUS_MODE.toUpperCase(),
        chain,
      });

  if (ledgerServer) logger.info("🛰️ LedgerServer initialized");

  /* 8️⃣ Telemetry */
  const watchtower = new WatchtowerHooks(config.orgId, config.region);
  const metrics = new MetricsCollector();

  /* 9️⃣ Consensus Engine */
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

  /* 🔟 Warm-Up Transaction */
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

  /* 🧩 Diagnostics */
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
