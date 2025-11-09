import { generateKeyPairSync, sign, verify } from "crypto";
import logger from "../utils/logger.js";

export class Ed25519 {
  static generateKeyPair() {
    const kp = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding:{ type: "pkcs8", format: "pem" },
    });
    logger.debug("🔐 Ed25519 keypair generated");
    return kp;
  }
  static sign(data, privateKey) {
    if (!privateKey) throw new Error("privateKey required");
    const msg = Buffer.from(typeof data === "string" ? data : JSON.stringify(data));
    return sign(null, msg, privateKey).toString("base64");
  }
  static verify(data, signature, publicKey) {
    if (!publicKey || !signature) return false;
    const msg = Buffer.from(typeof data === "string" ? data : JSON.stringify(data));
    return verify(null, msg, publicKey, Buffer.from(signature, "base64"));
  }
}
