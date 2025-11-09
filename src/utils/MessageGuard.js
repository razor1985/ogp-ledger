export function sanitizeMessage(obj) {
    // Drop unexpected fields / prevent prototype pollution
    if (obj && typeof obj === "object") {
      const clean = JSON.parse(JSON.stringify(obj));
      delete clean.__proto__;
      delete clean.constructor;
      return clean;
    }
    return obj;
  }
  
  export class Deduper {
    constructor(ttlMs = 60_000) { this.seen = new Map(); this.ttl = ttlMs; }
    seenBefore(id) {
      const now = Date.now();
      this.#sweep(now);
      if (this.seen.has(id)) return true;
      this.seen.set(id, now + this.ttl);
      return false;
    }
    #sweep(now) {
      for (const [k, t] of this.seen.entries()) if (t < now) this.seen.delete(k);
    }
  }
  