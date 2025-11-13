import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

// Load .env if exists
dotenv.config();

function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    logger.warn(`⚠️ Failed to load JSON config at ${filePath}: ${err.message}`);
  }
  return {};
}

export function loadConfig() {
  logger.info("📄 Loading OGP Ledger configuration...");

  // ----------------------------
  // 1️⃣ Load config.json
  // ----------------------------
  const jsonCfg = loadJsonFile(path.resolve("./config.json"));

  // ----------------------------
  // 2️⃣ Environment variables override
  // ----------------------------
  const envCfg = {
    orgId: process.env.ORG_ID,
    region: process.env.REGION,
    networkId: process.env.NETWORK_ID,
    adapter: process.env.ADAPTER,
    consensus: process.env.CONSENSUS_MODE,
    keyDir: process.env.KEY_DIR,
    logLevel: process.env.LOG_LEVEL,
  };

  // ----------------------------
  // 3️⃣ Defaults
  // ----------------------------
  const defaultCfg = {
    orgId: "ogp-default",
    region: "us-east-1",
    networkId: "ogp-devnet",
    adapter: "postgres",
    consensus: "pbft",
    keyDir: "./keys",
    logLevel: "info",
  };

  // ----------------------------
  // 4️⃣ Merge precedence:
  //     env > config.json > defaults
  // ----------------------------
  const finalCfg = {
    ...defaultCfg,
    ...jsonCfg,
    ...Object.fromEntries(
      Object.entries(envCfg).filter(([_, v]) => v !== undefined)
    ),
  };

  logger.info(
    `✅ Config loaded: org=${finalCfg.orgId}, region=${finalCfg.region}, network=${finalCfg.networkId}`
  );

  return finalCfg;
}

export default { loadConfig };
