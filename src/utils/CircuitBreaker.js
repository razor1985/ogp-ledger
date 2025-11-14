// src/utils/CircuitBreaker.js

export class CircuitBreaker {
  constructor({ failureThreshold = 3, recoveryTime = 10_000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.recoveryTime = recoveryTime; // ms
    this.failures = 0;
    this.state = "CLOSED"; // CLOSED | OPEN | HALF_OPEN
    this.nextTry = 0;
  }

  // --- Called when an operation succeeds ---
  recordSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
    this.nextTry = 0;
  }

  // --- Called when operation fails (this is what index.js expects) ---
  recordFailure() {
    this.failures++;

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextTry = Date.now() + this.recoveryTime;
    }
  }

  // --- Required by index.js ---
  isOpen() {
    if (this.state === "OPEN" && Date.now() > this.nextTry) {
      // transition to half-open
      this.state = "HALF_OPEN";
      return false;
    }
    return this.state === "OPEN";
  }

  // --- Called after a successful guardedInit ---
  reset() {
    this.failures = 0;
    this.state = "CLOSED";
    this.nextTry = 0;
  }

  // --- Optional helper ---
  canRequest() {
    if (this.state === "OPEN" && Date.now() < this.nextTry) return false;
    return true;
  }
}

export default CircuitBreaker;
