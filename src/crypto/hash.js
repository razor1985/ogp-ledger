// src/crypto/hash.js
// Unified hashing helpers (SHA3-512 primary, BLAKE3 optional)

import { createHash } from "crypto";

export class Hasher {
  static sha3(data) {
    const buf = Buffer.from(
      typeof data === "string" ? data : JSON.stringify(data)
    );
    return createHash("sha3-512").update(buf).digest("hex");
  }



  // Convenience wrapper: default to SHA3-512
  static hash(data) {
    return this.sha3(data);
  }
}
