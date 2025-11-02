// src/core/block.js
import crypto from "crypto";

/**
 * OGP Block – lightweight, minerless block structure.
 * Each block is cryptographically sealed by consensus signatures.
 */
export class Block {
  constructor(index, transactions, previousHash = "", consensusSignatures = []) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = JSON.parse(JSON.stringify(transactions));
    this.previousHash = previousHash;
    this.consensusSignatures = consensusSignatures; // validator signatures (PBFT/Raft)
    this.hash = this.calculateHash();
    Object.freeze(this.transactions);
    Object.freeze(this);
  }

  calculateHash() {
    const data = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      consensusSignatures: this.consensusSignatures,
    });
    return crypto.createHash("sha3-512").update(data).digest("hex");
  }

  validate(previousBlock) {
    if (this.previousHash !== previousBlock.hash) return false;
    return this.hash === this.calculateHash();
  }
}
