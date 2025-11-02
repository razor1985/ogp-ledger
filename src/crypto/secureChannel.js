// src/crypto/secureChannel.js
// Encrypted transport: ephemeral ECDH + AES-256-GCM

import crypto from "crypto";

export class SecureChannel {
  constructor() {
    // Ephemeral ECDH key pair (Curve25519)
    this.ecdh = crypto.createECDH("x25519");
    this.publicKey = this.ecdh.generateKeys();
  }

  // Establish shared secret from peer's public key
  deriveSharedSecret(peerPublicKey) {
    const secret = this.ecdh.computeSecret(Buffer.from(peerPublicKey, "base64"));
    // Derive 256-bit AES key
    this.aesKey = crypto.createHash("sha3-512").update(secret).digest().subarray(0, 32);
    return this.aesKey;
  }

  encrypt(plainText) {
    if (!this.aesKey) throw new Error("Shared key not derived");
    const iv = crypto.randomBytes(12); // GCM IV
    const cipher = crypto.createCipheriv("aes-256-gcm", this.aesKey, iv);
    const enc = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  }

  decrypt(cipherText) {
    if (!this.aesKey) throw new Error("Shared key not derived");
    const buf = Buffer.from(cipherText, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.aesKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc, null, "utf8") + decipher.final("utf8");
  }

  exportPublicKey() {
    return this.publicKey.toString("base64");
  }
}
