import { Ed25519 } from "./crypto/ed25519.js";
import { Blockchain } from "./core/blockchain.js";
import { PBFT } from "./consensus/pbft.js";
import { Raft } from "./consensus/raft.js";

export class LedgerServer {
  constructor({ orgId, privateKey = null, peers = [], consensus = "PBFT" } = {}) {
    this.orgId = orgId;
    this.privateKey = privateKey;

    // LedgerServer manages its own blockchain instance
    this.blockchain = new Blockchain();
    this.ledger = new Map();

    const mock = process.env.PBFT_MODE !== "production";

    if (consensus === "RAFT") {
      this.consensusEngine = new Raft({ mock, nodeId: orgId, peers });
      console.log(`🧭 Using Raft consensus | Mock: ${mock}`);
    } else {
      this.consensusEngine = new PBFT({ mock, nodeId: orgId, privateKey, peers });
      console.log(`🧭 Using PBFT consensus | Mock: ${mock}`);
    }
  }

  /**
   * 🟦 INTERNAL WARM-UP HANDLING
   * Skips signature + consensus + block commit
   * Used only for startup health checks.
   */
  async processTransaction(tx, senderPublicKey) {
    // 0️⃣ Internal warm-up/no-op
    if (tx.internal === true) {
      return { ok: true, internal: true };
    }

    // 1️⃣ Verify signature
    const { signature, ...txData } = tx;
    if (!Ed25519.verify(txData, signature, senderPublicKey)) {
      throw new Error("❌ Invalid signature");
    }

    // 2️⃣ Consensus
    const approved =
      (await this.consensusEngine.reachConsensus?.(tx)) ??
      (await this.consensusEngine.replicate?.(tx));

    if (!approved) throw new Error("❌ Consensus/Replication failed");

    // 3️⃣ Add & commit block
    await this.blockchain.addTransaction(tx);
    await this.blockchain.commitBlock(this.consensusEngine.validatorSignatures);

    // 4️⃣ Update balances for simple ledger model
    this.updateBalances(tx);

    return { ok: true };
  }

  updateBalances(tx) {
    const { from, to, amount, type } = tx;

    if (type === "mint") {
      this.ledger.set(to, (this.ledger.get(to) || 0) + amount);
    } else {
      this.ledger.set(from, (this.ledger.get(from) || 0) - amount);
      this.ledger.set(to, (this.ledger.get(to) || 0) + amount);
    }
  }

  getBalance(accountId) {
    return this.ledger.get(accountId) || 0;
  }
}
