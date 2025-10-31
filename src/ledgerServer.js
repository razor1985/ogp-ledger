import { OGPServer } from "ogp-services-node";
import { validateSchema } from "./consensus/schemaValidator.js";
import { pbftConsensus } from "./consensus/pbft.js";
import { v4 as uuidv4 } from "uuid";

export class LedgerServer {
  constructor(config = {}) {
    this.ogp = new OGPServer({
      orgId: config.orgId || "OGP_Foundation",
      serviceType: "ledger",
      region: config.region || "ap-south-1",
    });
    this.ledger = new Map();
  }

  async start() {
    this.ogp.registerSchema("ledger_v1", {
      fields: ["from", "to", "amount", "nonce", "signature"],
      rules: { amount: ">0" },
    });

    this.ogp.on("ledger.tx", async (tx) => {
      if (!validateSchema(tx)) return;
      const approved = await pbftConsensus(tx);
      if (approved) {
        const txId = uuidv4();
        this.ledger.set(txId, tx);
        console.log("✅ Transaction accepted:", txId);
      } else {
        console.log("❌ Transaction rejected:", tx);
      }
    });

    this.ogp.listen();
    console.log("🚀 OGP Ledger Server running");
  }

  getBalance(org) {
    let balance = 0;
    for (const [, tx] of this.ledger) {
      if (tx.to === org) balance += tx.amount;
      if (tx.from === org) balance -= tx.amount;
    }
    return balance;
  }
}
