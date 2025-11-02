// src/crypto/ed25519.js
// Modern, deterministic signing (stronger & faster than ECDSA)

import { generateKeyPairSync, sign, verify } from "crypto";

export class Ed25519 {
  static generateKeyPair() {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    return { publicKey, privateKey };
  }

  static sign(data, privateKey) {
    const message = Buffer.from(
      typeof data === "string" ? data : JSON.stringify(data)
    );
    return sign(null, message, privateKey).toString("base64");
  }

  static verify(data, signature, publicKey) {
    const message = Buffer.from(
      typeof data === "string" ? data : JSON.stringify(data)
    );
    return verify(null, message, publicKey, Buffer.from(signature, "base64"));
  }
}
