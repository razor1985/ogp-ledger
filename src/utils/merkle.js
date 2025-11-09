// src/utils/merkle.js
import crypto from "crypto";

/**
 * Compute Merkle root of a list of transactions.
 */
export function computeMerkleRoot(transactions = []) {
  if (!Array.isArray(transactions) || transactions.length === 0)
    return crypto.createHash("sha256").update("EMPTY").digest("hex");

  let hashes = transactions.map((tx) =>
    crypto.createHash("sha256").update(JSON.stringify(tx)).digest("hex")
  );

  while (hashes.length > 1) {
    const next = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      const combined = crypto.createHash("sha256").update(left + right).digest("hex");
      next.push(combined);
    }
    hashes = next;
  }
  return hashes[0];
}

/**
 * SHA3 wrapper (used for testing / optional integrity checks)
 */
export function sha3(input) {
  return crypto.createHash("sha3-256").update(input).digest("hex");
}

/**
 * Backward compatibility exports for older code.
 */
export const merkleRoot = computeMerkleRoot;
