export class CircuitBreaker {
    constructor({ failThreshold = 5, resetMs = 30_000 } = {}) {
      this.failThreshold = failThreshold;
      this.resetMs = resetMs;
      this.failures = 0;
      this.state = "CLOSED";
      this.nextTry = 0;
    }
    canRequest() {
      if (this.state === "OPEN" && Date.now() < this.nextTry) return false;
      if (this.state === "OPEN" && Date.now() >= this.nextTry) this.state = "HALF";
      return true;
    }
    success() { this.failures = 0; this.state = "CLOSED"; }
    fail() {
      this.failures++;
      if (this.failures >= this.failThreshold) {
        this.state = "OPEN";
        this.nextTry = Date.now() + this.resetMs;
      }
    }
  }
  