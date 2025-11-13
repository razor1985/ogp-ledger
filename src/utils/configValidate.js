import fs from "fs";
import path from "path";
import logger from "./logger.js";

export function validateConfig(cfg = {}) {
  if (typeof cfg !== "object") {
    throw new Error("Config must be an object");
  }

  logger.info("🔍 Validating OGP Ledger configuration...");

  // ---------------------------------------------------------------------
  // 1️⃣ Required top-level fields
  // ---------------------------------------------------------------------
  const required = ["orgId", "region", "networkId"];
  for (const field of required) {
    if (!cfg[field] || typeof cfg[field] !== "string") {
      throw new Error(`❌ Missing or invalid config: '${field}' must be a non-empty string`);
    }
  }

  // ---------------------------------------------------------------------
  // 2️⃣ orgId validation
  // ---------------------------------------------------------------------
  if (!/^[a-zA-Z0-9._-]+$/.test(cfg.orgId)) {
    throw new Error(
      `❌ Invalid orgId '${cfg.orgId}'. Only letters, digits, ., _ and - allowed.`
    );
  }

  // ---------------------------------------------------------------------
  // 3️⃣ region validation
  // ---------------------------------------------------------------------
  const allowedRegions = [
    "us-east-1",
    "us-west-2",
    "eu-central-1",
    "ap-south-1",
    "ap-southeast-1",
  ];

  if (!allowedRegions.includes(cfg.region)) {
    logger.warn(
      `⚠️ Region '${cfg.region}' not recognized. ` +
        `Allowed: ${allowedRegions.join(", ")}. Proceeding anyway.`
    );
  }

  // ---------------------------------------------------------------------
  // 4️⃣ networkId validation
  // ---------------------------------------------------------------------
  if (cfg.networkId.length < 3) {
    throw new Error("❌ networkId must be at least 3 characters long.");
  }

  // ---------------------------------------------------------------------
  // 5️⃣ Database adapter validation
  // ---------------------------------------------------------------------
  const allowedAdapters = ["postgres", "sqlite", "memory"];

  if (cfg.adapter && !allowedAdapters.includes(cfg.adapter)) {
    throw new Error(
      `❌ Invalid adapter '${cfg.adapter}'. Valid: ${allowedAdapters.join(", ")}`
    );
  }

  // Apply default adapter if missing
  if (!cfg.adapter) {
    cfg.adapter = "postgres";
    logger.info("ℹ️ No adapter specified — using 'postgres'");
  }

  // ---------------------------------------------------------------------
  // 6️⃣ Key directory validation
  // ---------------------------------------------------------------------
  if (cfg.keyDir) {
    const fullPath = path.resolve(cfg.keyDir);
    if (!fs.existsSync(fullPath)) {
      logger.warn(`⚠️ keyDir '${cfg.keyDir}' does not exist. Creating…`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
  } else {
    cfg.keyDir = "./keys";
    logger.info("ℹ️ No keyDir provided — using default './keys'");
  }

  // ---------------------------------------------------------------------
  // 7️⃣ Consensus mode validation
  // ---------------------------------------------------------------------
  const allowedConsensus = ["pbft", "raft"];
  if (cfg.consensus && !allowedConsensus.includes(cfg.consensus.toLowerCase())) {
    throw new Error(
      `❌ Invalid consensus mode '${cfg.consensus}'. Use 'pbft' or 'raft'.`
    );
  }

  if (!cfg.consensus) {
    cfg.consensus = "pbft";
    logger.info("ℹ️ No consensus specified — using PBFT");
  }

  // ---------------------------------------------------------------------
  // 8️⃣ Logging level validation
  // ---------------------------------------------------------------------
  const allowedLogLevels = ["debug", "info", "warn", "error"];
  if (cfg.logLevel && !allowedLogLevels.includes(cfg.logLevel)) {
    logger.warn(
      `⚠️ Invalid logLevel '${cfg.logLevel}'. Allowed: ${allowedLogLevels.join(
        ", "
      )}. Defaulting to 'info'.`
    );
    cfg.logLevel = "info";
  }

  // ---------------------------------------------------------------------
  // 9️⃣ Safe defaults for optional values
  // ---------------------------------------------------------------------
  cfg.snapshotInterval = cfg.snapshotInterval || 5000; // 5 seconds default
  cfg.healthCheckInterval = cfg.healthCheckInterval || 30000; // 30 seconds
  cfg.replicatorBatch = cfg.replicatorBatch || 10;

  logger.info("✅ Configuration validated successfully");
  return true;
}


export const configValidate = validateConfig;
