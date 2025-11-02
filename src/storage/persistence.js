// src/storage/persistence.js
import { Level } from "level";
import crypto from "crypto";

export class EncryptedStorage {
  constructor(path = "./ledgerdb", masterKey = null) {
    this.db = new Level(path, { valueEncoding: "json" });
    this.masterKey =
      masterKey ||
      crypto.createHash("sha3-512").update("OGP_DEFAULT_KEY").digest().subarray(0, 32);
  }

  async putBlock(hash, block) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKey, iv);
    const enc = Buffer.concat([
      cipher.update(JSON.stringify(block), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag().toString("base64");
    const payload = {
      iv: iv.toString("base64"),
      tag,
      data: enc.toString("base64"),
    };
    await this.db.put(hash, payload);
  }

  async getBlock(hash) {
    const payload = await this.db.get(hash);
    const iv = Buffer.from(payload.iv, "base64");
    const tag = Buffer.from(payload.tag, "base64");
    const data = Buffer.from(payload.data, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKey, iv);
    decipher.setAuthTag(tag);
    const dec = decipher.update(data, null, "utf8") + decipher.final("utf8");
    return JSON.parse(dec);
  }

  async close() {
    await this.db.close();
  }
}
