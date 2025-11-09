/**
 * @razor1985/ogp-ledger
 * -------------------------------------------------
 * OGP Ledger v3.6 — Minerless Blockchain with PBFT/Raft Consensus
 * Integrated with @razor1985/ogp-fabricController + @razor1985/ogp-ledgerdb
 * -------------------------------------------------
 * Highlights:
 *   ✅ PBFT & Raft Consensus Engines
 *   ✅ LedgerDB persistence + replication (multi-region)
 *   ✅ Watchtower metrics & Fabric health telemetry
 *   ✅ Auto snapshot restore + CircuitBreaker resilience
 *   ✅ Headless mode + diagnostic telemetry for Mgmt UI
 */

import { fabric } from "./fabric/broker.js";
import { setupPBFTListeners, broadcastPBFT } from "./pbft/handler.js";
import { Blockchain } from "./core/blockchain.js";
import { LedgerServer } from "./utils/ledgerServer.js";
import { logger } from "./utils/logger.js";
import { loadConfig } from "./config/fabric.js";
import { PBFT } from "./consensus/pbft.js";
import { Raft } from "./consensus/raft.js";
import { PBFTView } from "./consensus/PBFTView.js";
import { CircuitBreaker } from "./utils/CircuitBreaker.js";
import { LedgerDBService, FabricReplicator35, WatchtowerHooks } from "@razor1985/ogp-ledgerdb";
import { MetricsCollector } from "./utils/metrics.js";
import { configValidate } from "./utils/configValidate.js";
import { keyManager } from "./crypto/keyManager.js";
import { KeyRotationManager } from "./security/KeyRotationManager.js";
// -----------------------------------------------------------------------------
// Exports for module consumers (SDK or embedded use)
// -----------------------------------------------------------------------------
export { Block } from "./core/block.js";
export { TxValidator } from "./core/TxValidator.js";
export { PBFT } from "./consensus/pbft.js";
export { PBFTView } from "./consensus/PBFTView.js";
export { KeyStore } from "./crypto/KeyStore.js";
export { CircuitBreaker } from "./utils/CircuitBreaker.js";
export { sanitizeMessage, Deduper } from "./utils/MessageGuard.js";
export { metrics } from "./utils/metrics.js";
export * as merkle from "./utils/merkle.js";

// -----------------------------------------------------------------------------
// Node Runtime Entrypoint
// -----------------------------------------------------------------------------
const CONSENSUS_MODE = process.env.CONSENSUS_MODE || "pbft";
const MODE = process.env.MODE || "dev";
const HEADLESS = process.env.HEADLESS === "true"; // for Mgmt UI attach

(async () => {
  logger.info(`🚀 Launching OGP Ledger Node [mode=${MODE}, consensus=${CONSENSUS_MODE}]`);

  // 1️⃣ Validate configuration before startup
  const config = loadConfig();
  configValidate(config);
  logger.info(`✅ Loaded config for org=${config.orgId}, region=${config.region}`);

  // 2️⃣ Initialize CircuitBreaker to protect startup sequence
  const nodeCircuit = new CircuitBreaker({ failureThreshold: 3, recoveryTime: 10000 });

  const guardedInit = async (label, fn) => {
    try {
      await fn();
      nodeCircuit.reset();
    } catch (err) {
      nodeCircuit.recordFailure();
      logger.error(`❌ ${label} failed: ${err.message}`);
      if (nodeCircuit.isOpen()) throw new Error(`Circuit open — aborting startup at ${label}`);
    }
  };

  

  // 3️⃣ Initialize LedgerDB for persistence & replication
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

  // 4️⃣ Initialize Fabric communication
  await guardedInit("Fabric Broker", async () => {
    await fabric.connect();
    await fabric.register({
      org: config.orgId,
      service: "ledger-validator",
      version: "3.6.0",
      endpoints: ["pbft.prepare", "pbft.commit", "ledger.alert", "replication.event"],
    });
    logger.info("🌐 Fabric registered and active");
  });


// ✅ 4.5 — Key Rotation Manager
await guardedInit("Key Rotation Manager", async () => {
    const keyRotation = new KeyRotationManager(fabric, { keyDir: "./keys" });
    await keyRotation.init();
    logger.info(`🔐 Key rotation active for ${config.orgId}`);
  });
  

  // 5️⃣ Bootstrap Replicator (multi-region sync)
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

  

  // 6️⃣ Initialize Blockchain Core with DB + Snapshot recovery
  const chain = new Blockchain({ ledgerDB, orgId: config.orgId });
  if (!(await chain.recoverFromSnapshot())) {
    logger.warn("⚠️ Snapshot not found or invalid — creating genesis");
    await chain.createGenesisBlock();
  }
  logger.info(`📜 Blockchain ready (height=${chain.getLatestBlock()?.index || 0})`);

  // 7️⃣ Initialize LedgerServer (if not headless)
  const ledgerServer = HEADLESS ? null : new LedgerServer(chain);
  if (ledgerServer) logger.info("🛰️ LedgerServer initialized");

  // 8️⃣ Initialize Watchtower + Metrics
  const watchtower = new WatchtowerHooks(config.orgId, config.region);
  const metrics = new MetricsCollector();

  // 9️⃣ Choose Consensus Engine
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

  // 🔟 Warm-up verification transaction (non-persistent)
  const tx = { from: "TestUser", to: "Verifier", amount: 1, ts: Date.now() };
  const ledgerApi = ledgerServer || { processTransaction: async () => ({ mock: true }) };
  const result = await ledgerApi.processTransaction(tx);
  logger.info(`💸 Warm-up Tx processed: ${JSON.stringify(result)}`);

  // 🧩 Final stage diagnostics + telemetry push
  const latestBlock = chain.getLatestBlock();
  watchtower.push({ blockId: latestBlock.blockId, orgId: config.orgId });
  metrics.increment("blocks_committed");

  logger.info("✅ OGP Ledger Node fully initialized (Stage 3.6)");
  if (HEADLESS) logger.info("🔍 Running in headless mode — Mgmt UI telemetry only");
})();
