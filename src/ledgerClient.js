import { OGPClient } from "@razor1985/ogp-services-client";
import { signData } from "./crypto/signer.js";

export class LedgerClient {
  constructor({ orgId, privateKey }) {
    this.orgId = orgId;
    this.privateKey = privateKey;
    this.ogp = new OGPClient({ orgId, privateKey });
  }

  async transfer(to, amount) {
    const tx = {
      from: this.orgId,
      to,
      amount,
      nonce: Date.now().toString(),
    };
    tx.signature = signData(tx, this.privateKey);
    await this.ogp.send("ledger.tx", tx);
    console.log("📤 Sent transaction:", tx);
  }

  async mint(to, amount) {
    const mintTx = {
      from: "OGP_Foundation",
      to,
      amount,
      type: "mint",
      nonce: Date.now().toString(),
    };
    mintTx.signature = signData(mintTx, this.privateKey);
    await this.ogp.send("ledger.tx", mintTx);
    console.log("💰 Minted tokens:", mintTx);
  }
}
