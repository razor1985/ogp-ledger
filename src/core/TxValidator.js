export class TxValidator {
    constructor(rules = {}) {
      this.rules = {
        basic: (tx) => typeof tx === "object" && tx && typeof tx.amount === "number" &&
                       tx.amount >= 0 && typeof tx.from === "string" && typeof tx.to === "string",
        signature: (tx) => !!tx.signature, // real sig verify done in Block.verify()
        ...rules,
      };
    }
    validate(tx) {
      for (const [name, fn] of Object.entries(this.rules)) {
        if (!fn(tx)) return { ok: false, reason: `rule:${name}` };
      }
      return { ok: true };
    }
  }
  