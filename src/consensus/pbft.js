import crypto from "crypto";
import logger from "../utils/logger.js";
import { ViewManager } from "./PBFTView.js";
import { SnapshotStore } from "../state/SnapshotStore.js";
import { CircuitBreaker } from "../utils/CircuitBreaker.js";

export class PBFT {
  constructor(fabric, chain, viewManager = new ViewManager()) {
    this.fabric = fabric;
    this.chain = chain;
    this.viewManager = viewManager;
    this.snapshot = new SnapshotStore();
    this.state = { sequence: 0, phase: "idle" };
    this.circuit = new CircuitBreaker({ failureThreshold: 3, recoveryTime: 15000 });
    this.validators = new Set();
    this.timeout = 8000;
  }

  async start(validators = []) {
    this.validators = new Set(validators);
    this.leader = this.viewManager.rotate([...this.validators]);
    logger.info(`🧭 PBFT started with leader=${this.leader}`);
  }

  async prePrepare(block) {
    this.state.phase = "pre-prepare";
    this.state.sequence++;
    this.digest = this._hash(block);
    logger.info(`📦 Pre-prepare seq=${this.state.sequence}`);
    await this.fabric.publish("pbft.prepare", { digest: this.digest, seq: this.state.sequence });
    this._startTimeout();
  }

  async prepare(msg) {
    if (this.state.phase !== "pre-prepare") return;
    this.state.phase = "prepare";
    logger.info(`📡 Prepare phase seq=${msg.seq}`);
    await this.fabric.publish("pbft.commit", msg);
  }

  async commit(msg) {
    if (this.state.phase !== "prepare") return;
    this.state.phase = "commit";
    const block = this.chain.getLatestBlock();
    await this.chain.commitBlockWithDB(block);
    this.snapshot.saveSnapshot({ height: block.index, lastHash: block.hash });
    logger.info(`✅ Block committed via PBFT seq=${msg.seq}`);
  }

  async handleTimeout() {
    logger.warn("⏱️ PBFT timeout — rotating leader");
    this.leader = this.viewManager.rotate([...this.validators]);
    this.state.phase = "idle";
    this.circuit.recordFailure();
    logger.info(`🔁 View changed → new leader=${this.leader}`);
  }

  checkpoint() {
    const latest = this.chain.getLatestBlock();
    this.snapshot.saveSnapshot({ height: latest.index, lastHash: latest.hash });
    logger.info(`🧩 Checkpoint saved height=${latest.index}`);
  }

  _startTimeout() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.handleTimeout(), this.timeout);
  }

  _hash(data) {
    return crypto.createHash("sha3-512").update(JSON.stringify(data)).digest("hex");
  }
}
