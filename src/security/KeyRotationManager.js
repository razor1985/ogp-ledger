/**
 * @file KeyRotationManager.js
 * ---------------------------------------
 * Automates Ed25519 key rotation and propagation
 * across OGP Fabric mesh (no TLS, no certs, no JWT).
 *
 * ✅ Features:
 *  - Automatic rotation at defined interval
 *  - Grace period for backward compatibility
 *  - Publishes key updates via Fabric
 *  - Logs key fingerprints for audit trail
 *  - Self-healing: re-announces on restart
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import logger from "../utils/logger.js";

export class KeyRotationManager {
  constructor(fabric, options = {}) {
    this.fabric = fabric;
    this.rotationHours = parseInt(process.env.KEY_ROTATION_INTERVAL_HOURS || "24");
    this.gracePeriodMinutes = parseInt(process.env.KEY_GRACE_PERIOD_MINUTES || "15");
    this.keyDir = options.keyDir || "./keys";
    this.orgId = fabric.config?.orgId || "unknown-org";
    this.activeKeyPath = path.join(this.keyDir, `${this.orgId}_active.pem`);
    this.previousKeyPath = path.join(this.keyDir, `${this.orgId}_previous.pem`);
    this.isRunning = false;
  }

  async init() {
    await this.ensureKeyDir();
    if (!fs.existsSync(this.activeKeyPath)) await this.generateKeyPair("active");
    if (!fs.existsSync(this.previousKeyPath)) fs.writeFileSync(this.previousKeyPath, "");

    // Load current active keypair
    const { publicKey, privateKey } = this.loadKeyPair("active");
    this.fabric.identityManager.updateKeys({ publicKey, privateKey });

    // Announce to fabric
    await this.publishKeyAnnouncement(publicKey);
    this.scheduleRotation();
    this.isRunning = true;
    logger.info(`🔑 KeyRotationManager initialized for ${this.orgId}`);
  }

  async ensureKeyDir() {
    if (!fs.existsSync(this.keyDir)) fs.mkdirSync(this.keyDir, { recursive: true });
  }

  generateKeyPair(label) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    fs.writeFileSync(path.join(this.keyDir, `${this.orgId}_${label}_private.pem`), privateKey.export({ type: "pkcs8", format: "pem" }));
    fs.writeFileSync(path.join(this.keyDir, `${this.orgId}_${label}_public.pem`), publicKey.export({ type: "spki", format: "pem" }));
    return { publicKey, privateKey };
  }

  loadKeyPair(label) {
    const privPath = path.join(this.keyDir, `${this.orgId}_${label}_private.pem`);
    const pubPath = path.join(this.keyDir, `${this.orgId}_${label}_public.pem`);
    const privateKey = crypto.createPrivateKey(fs.readFileSync(privPath, "utf8"));
    const publicKey = crypto.createPublicKey(fs.readFileSync(pubPath, "utf8"));
    return { privateKey, publicKey };
  }

  async rotateKeys() {
    logger.info(`♻️ Initiating key rotation for ${this.orgId}`);

    // 1️⃣ Backup active to previous
    const activePriv = fs.readFileSync(this.activeKeyPath.replace(".pem", "_private.pem"));
    const activePub = fs.readFileSync(this.activeKeyPath.replace(".pem", "_public.pem"));
    fs.writeFileSync(this.previousKeyPath.replace(".pem", "_private.pem"), activePriv);
    fs.writeFileSync(this.previousKeyPath.replace(".pem", "_public.pem"), activePub);

    // 2️⃣ Generate new keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    fs.writeFileSync(this.activeKeyPath.replace(".pem", "_private.pem"), privateKey.export({ type: "pkcs8", format: "pem" }));
    fs.writeFileSync(this.activeKeyPath.replace(".pem", "_public.pem"), publicKey.export({ type: "spki", format: "pem" }));

    // 3️⃣ Update runtime
    this.fabric.identityManager.updateKeys({ publicKey, privateKey });
    await this.publishKeyAnnouncement(publicKey);

    // 4️⃣ Schedule grace cleanup
    setTimeout(() => {
      fs.unlinkSync(this.previousKeyPath.replace(".pem", "_private.pem"));
      fs.unlinkSync(this.previousKeyPath.replace(".pem", "_public.pem"));
      logger.info(`🧹 Grace period expired; old keys removed for ${this.orgId}`);
    }, this.gracePeriodMinutes * 60 * 1000);

    logger.info(`✅ Key rotation completed for ${this.orgId}`);
  }

  async publishKeyAnnouncement(publicKey) {
    const fingerprint = crypto.createHash("sha256").update(publicKey.export({ format: "pem" })).digest("hex").slice(0, 16);
    const payload = {
      orgId: this.orgId,
      keyId: fingerprint,
      publicKey: publicKey.export({ format: "pem" }),
      timestamp: new Date().toISOString(),
    };

    try {
      await this.fabric.publish("fabric.key.update", payload);
      logger.info(`📡 Published key update to fabric (fingerprint=${fingerprint})`);
    } catch (err) {
      logger.error(`❌ Failed to publish key update: ${err.message}`);
    }
  }

  scheduleRotation() {
    const intervalMs = this.rotationHours * 3600 * 1000;
    setInterval(() => this.rotateKeys(), intervalMs);
    logger.info(`⏱️ Next key rotation scheduled in ${this.rotationHours} hours`);
  }
}
