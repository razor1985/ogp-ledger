import crypto from "crypto";
import { merkleRoot, sha3 } from "../utils/merkle.js";
import { Ed25519 } from "../crypto/ed25519.js";

export class Block {
  constructor({ index, transactions, previousHash, consensusSignatures = [], view = 0, seq = 0 }) {
    this.index = index;
    this.timestamp = Date.now();
    this.view = view;
    this.seq = seq;
    this.transactions = JSON.parse(JSON.stringify(transactions));
    this.previousHash = previousHash || "0";
    this.merkleRoot = merkleRoot(this.transactions);
    this.consensusSignatures = consensusSignatures; // [{validatorId, signature, pubKey}]
    this.hash = this.calculateHash();
    Object.freeze(this.transactions);
    Object.freeze(this);
  }

  calculateHash() {
    const data = JSON.stringify({
      index: this.index, timestamp: this.timestamp, view: this.view, seq: this.seq,
      previousHash: this.previousHash, merkleRoot: this.merkleRoot
    });
    return sha3(data);
  }

  validateLink(prev) {
    return this.previousHash === prev.hash && this.hash === this.calculateHash();
  }

  verifySignatures(quorum = 1) {
    let good = 0;
    for (const sig of this.consensusSignatures) {
      const ok = Ed25519.verify(this.hash, sig.signature, sig.publicKey);
      if (ok) good++;
    }
    return good >= quorum;
  }
}
