export class PBFTView {
    constructor({ f = 1, lowWatermark = 0, highWatermark = 10_000 } = {}) {
      this.view = 0;
      this.seq = 0;
      this.f = f;
      this.lowWatermark = lowWatermark;
      this.highWatermark = highWatermark;
      this.messageIds = new Set(); // dedup
    }
    nextSeq() { return ++this.seq; }
    inWatermark(seq) { return seq >= this.lowWatermark && seq <= this.highWatermark; }
    dedup(id) { if (this.messageIds.has(id)) return false; this.messageIds.add(id); return true; }
    changeView() { this.view++; }
    quorumSize(n) { return Math.floor((2 * n) / 3) + 1; }
  }
  