import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "../utils/logger.js";

const KEY_DIR = "./keys";
const PRIVATE_KEY_FILE = "private.pem";
const PUBLIC_KEY_FILE = "public.pem";

function ensureKeyDir() {
  if (!fs.existsSync(KEY_DIR)) {
    logger.warn(`⚠️ Key directory does not exist: ${KEY_DIR}, creating...`);
    fs.mkdirSync(KEY_DIR, { recursive: true });
  }
}

function loadOrCreateKeyPair() {
  ensureKeyDir();

  const privatePath = path.join(KEY_DIR, PRIVATE_KEY_FILE);
  const publicPath = path.join(KEY_DIR, PUBLIC_KEY_FILE);

  // If keys exist → load
  if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    return {
      privateKey: fs.readFileSync(privatePath, "utf-8"),
      publicKey: fs.readFileSync(publicPath, "utf-8")
    };
  }

  // Otherwise → create new keypair
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");

  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const pubPem = publicKey.export({ type: "spki", format: "pem" });

  fs.writeFileSync(privatePath, privPem);
  fs.writeFileSync(publicPath, pubPem);

  logger.info("🔑 Generated new Ed25519 keypair");

  return { privateKey: privPem, publicKey: pubPem };
}

export const keyManager = {
  init() {
    this.keys = loadOrCreateKeyPair();
    return this.keys;
  },

  getPrivateKey() {
    if (!this.keys) this.init();
    return this.keys.privateKey;
  },

  getPublicKey() {
    if (!this.keys) this.init();
    return this.keys.publicKey;
  },

  rotate() {
    logger.info("🔄 Rotating keys...");
    this.keys = loadOrCreateKeyPair();
    return this.keys;
  }
};

export default keyManager;
