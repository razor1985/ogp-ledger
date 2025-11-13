// --------------------------------------------------------------
// PBFTView (low-level view + seq + watermark + dedup state)
// --------------------------------------------------------------
export class PBFTView {
  constructor({ f = 1, lowWatermark = 0, highWatermark = 10_000 } = {}) {
    this.view = 0;
    this.seq = 0;
    this.f = f;
    this.lowWatermark = lowWatermark;
    this.highWatermark = highWatermark;
    this.messageIds = new Set(); // dedup
  }

  nextSeq() { 
    return ++this.seq; 
  }

  inWatermark(seq) { 
    return seq >= this.lowWatermark && seq <= this.highWatermark; 
  }

  dedup(id) { 
    if (this.messageIds.has(id)) return false; 
    this.messageIds.add(id); 
    return true; 
  }

  changeView() { 
    this.view++; 
  }

  quorumSize(n) { 
    return Math.floor((2 * n) / 3) + 1; 
  }
}

// --------------------------------------------------------------
// ViewManager (high-level PBFT orchestration + leader rotation)
// --------------------------------------------------------------
export class ViewManager {
  constructor({ f = 1 } = {}) {
    this.state = new PBFTView({ f });
  }

  // Rotate leaders using view number
  rotate(validators = []) {
    if (!validators.length) return null;

    // PBFT leader = view % n
    const index = this.state.view % validators.length;
    const leader = validators[index];

    this.state.changeView();
    return leader;
  }

  nextSeq() {
    return this.state.nextSeq();
  }

  inWatermark(seq) {
    return this.state.inWatermark(seq);
  }

  dedup(id) {
    return this.state.dedup(id);
  }

  quorumSize(n) {
    return this.state.quorumSize(n);
  }
}
