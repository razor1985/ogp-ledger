import fs from "fs";
import logger from "../utils/logger.js";
import { Block } from "./block.js";
import { merkleRoot, computeMerkleRoot  } from "../utils/merkle.js";
import { SnapshotStore } from "../state/SnapshotStore.js";
import { TxValidator } from "./TxValidator.js";
import { LedgerDBService } from "@razor1985/ogp-ledgerdb";
import { CircuitBreaker } from "@razor1985/ogp-ledgerdb";

export class Blockchain {
  constructor({
    storagePath = "./ledger.db",
    orgId = "default-org",
    region = "local",
    ledgerDB = null,
  } = {}) {
    this.orgId = orgId;
    this.region = region;
    this.storagePath = storagePath;
    this.snapshot = new SnapshotStore();
    this.txv = new TxValidator();
    this.chain = [];
    this.pendingTransactions = [];
    this.ledgerDB = ledgerDB;
    this.circuit = new CircuitBreaker({ failureThreshold: 3, recoveryTime: 10000 });
  }

  /* ---------------------------------------------------------------------- */
  /* 🔹 Basic Lifecycle                                                     */
  /* ---------------------------------------------------------------------- */
  async initialize() {
    if (!(await this.isChainValid())) throw new Error("Chain integrity failed on startup");
    const snap = this.snapshot.loadSnapshot();
    if (snap && snap.height >= 1) {
      logger.info(`⏪ Loaded snapshot height=${snap.height}`);
    }
  }

  createGenesisBlock() {
    const g = new Block({
      index: 0,
      transactions: [{ genesis: true }],
      previousHash: "0",
      consensusSignatures: ["genesis"],
    });
    this.chain = [g];
    return g;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /* ---------------------------------------------------------------------- */
  /* 🔹 Transaction + Commit (in-memory)                                    */
  /* ---------------------------------------------------------------------- */
  async addTransaction(tx) {
    const { ok, reason } = this.txv.validate(tx);
    if (!ok) throw new Error(`Tx invalid: ${reason}`);
    this.pendingTransactions.push(tx);
  }

  async commitBlock(consensusSignatures = []) {
    if (this.pendingTransactions.length === 0) return;
    const prev = this.getLatestBlock();
    const block = new Block({
      index: this.chain.length,
      transactions: this.pendingTransactions,
      previousHash: prev.hash,
      consensusSignatures,
    });

    const beforeLen = this.chain.length;
    try {
      if (!block.validateLink(prev)) throw new Error("invalid link");
      if (merkleRoot(block.transactions) !== block.merkleRoot)
        throw new Error("merkle mismatch");

      this.chain.push(block);
      fs.appendFileSync(this.storagePath, JSON.stringify(block) + "\n");
      this.pendingTransactions = [];
      this.snapshot.saveSnapshot({ height: block.index, lastHash: block.hash });
      logger.info(`📦 Block #${block.index} committed`);
    } catch (e) {
      this.chain = this.chain.slice(0, beforeLen);
      throw e;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 🔹 LedgerDB Integration (Stage 3.5)                                    */
  /* ---------------------------------------------------------------------- */
  async initLedgerDB() {
    if (!this.ledgerDB) {
      this.ledgerDB = new LedgerDBService({
        adapter: process.env.ADAPTER || "postgres",
        orgId: this.orgId,
        region: this.region,
      });
      await this.ledgerDB.connect();
      logger.info("🔗 LedgerDB initialized for Blockchain");
    }
  }

  async commitBlockWithDB(block) {
    await this.initLedgerDB();
    if (!block.blockId) block.blockId = `blk-${Date.now()}`;
    try {
      await this.ledgerDB.writeBlock(block);
      this.snapshot.saveSnapshot({ height: block.index, lastHash: block.hash });
      logger.info(`💾 Block ${block.blockId} persisted to LedgerDB`);
    } catch (err) {
      logger.error(`❌ LedgerDB commit failed: ${err.message}`);
      this.circuit.recordFailure();
      throw err;
    }
  }

  async verifyIntegrityFull() {
    await this.initLedgerDB();
    const blocks = await this.ledgerDB.listBlocks(0);
    for (let i = 1; i < blocks.length; i++) {
      const cur = blocks[i];
      const prev = blocks[i - 1];
      if (cur.prevHash !== prev.blockHash) {
        logger.warn(`⚠️ Chain break at ${cur.blockId}`);
        return false;
      }
      const recomputed = computeMerkleRoot(cur.transactions);
      if (recomputed !== cur.merkleRoot) {
        logger.error(`❌ Merkle mismatch at ${cur.blockId}`);
        return false;
      }
    }
    logger.info("✅ LedgerDB integrity verified across all blocks");
    return true;
  }

  async recoverFromSnapshot() {
    const snap = this.snapshot.loadSnapshot();
    if (!snap) return false;
    await this.initLedgerDB();
    const last = await this.ledgerDB.fetchBlock(snap.lastHash);
    if (last) {
      this.chain = [last];
      logger.info(`🧩 Blockchain recovered to height ${snap.height}`);
      return true;
    }
    logger.warn("⚠️ Snapshot recovery failed");
    return false;
  }

  /* ---------------------------------------------------------------------- */
  /* 🔹 Validation Helpers                                                  */
  /* ---------------------------------------------------------------------- */
  async isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const cur = this.chain[i],
        prev = this.chain[i - 1];
      if (!cur.validateLink(prev)) return false;
    }
    return true;
  }
}
