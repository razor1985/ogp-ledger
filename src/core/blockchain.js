// src/core/blockchain.js
import { Block } from "./block.js";
import fs from "fs";

export class Blockchain {
  constructor({ storagePath = "./ledger.db" } = {}) {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.storagePath = storagePath;
  }

  createGenesisBlock() {
    return new Block(0, [{ genesis: true }], "0", ["OGP_Foundation"]);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  async addTransaction(tx) {
    this.pendingTransactions.push(tx);
  }

  async commitBlock(consensusSignatures = []) {
    if (this.pendingTransactions.length === 0) return;

    const block = new Block(
      this.chain.length,
      this.pendingTransactions,
      this.getLatestBlock().hash,
      consensusSignatures
    );

    this.chain.push(block);
    await this.persistBlock(block);
    this.pendingTransactions = [];

    console.log(
      `📦 Block #${block.index} committed with ${consensusSignatures.length} validator signatures`
    );
  }

  async persistBlock(block) {
    const line = JSON.stringify(block) + "\n";
    fs.appendFileSync(this.storagePath, line);
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      if (!current.validate(previous)) {
        console.error(`❌ Block ${i} invalid linkage`);
        return false;
      }
    }
    console.log("✅ Chain verified — cryptographically intact.");
    return true;
  }

  getLedgerSummary() {
    return this.chain.map((b) => ({
      index: b.index,
      txCount: b.transactions.length,
      signers: b.consensusSignatures.map(s =>
        typeof s === "string" ? s : s.validatorId
      ),
      hash: b.hash.slice(0, 16),
    }));
  }
}
