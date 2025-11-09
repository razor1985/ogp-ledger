/**
 * utils/metrics.js
 * --------------------------------------------------
 * Unified Metrics Collector for OGP Fabric & Ledger
 * --------------------------------------------------
 * Supports:
 *   - Counters (incremental)
 *   - Gauges (current values)
 *   - Snapshot aggregation for Watchtower
 *   - Push hooks for FabricReplicator and LedgerDB
 */

import logger from "./logger.js";

export class Metrics {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
  }

  /** Increment a counter (default +1) */
  inc(name, by = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + by);
  }

  /** Set a gauge (current reading) */
  set(name, val) {
    this.gauges.set(name, val);
  }

  /** Fetch a snapshot of all metrics */
  snapshot() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      ts: Date.now(),
    };
  }

  reset() {
    this.counters.clear();
    this.gauges.clear();
  }
}

/**
 * High-level MetricsCollector
 * --------------------------------------------------
 * Wrapper that automatically pushes metrics to
 * Watchtower or Fabric for distributed telemetry.
 */
export class MetricsCollector extends Metrics {
  constructor({ orgId = "unknown", region = "unknown", autoPush = false } = {}) {
    super();
    this.orgId = orgId;
    this.region = region;
    this.autoPush = autoPush;
    this.pushInterval = null;
  }

  /** Record and optionally auto-push metrics */
  record(event, value = 1) {
    this.inc(event, value);
    logger.debug(`📊 Metric recorded: ${event}=${value}`);
  }

  /** Attach this collector to Watchtower or FabricReplicator */
  attachTo(watchtowerOrFabric) {
    if (!watchtowerOrFabric || typeof watchtowerOrFabric.push !== "function") return;
    this.pushTarget = watchtowerOrFabric;
    if (this.autoPush) this.startAutoPush();
  }

  /** Push current metrics snapshot */
  pushSnapshot() {
    const snap = this.snapshot();
    snap.orgId = this.orgId;
    snap.region = this.region;

    if (this.pushTarget?.push) {
      this.pushTarget.push(snap);
      logger.debug(`📡 Metrics pushed → ${this.pushTarget.constructor.name}`);
    } else {
      logger.debug("📊 Local Metrics Snapshot:", snap);
    }
    return snap;
  }

  /** Enable periodic auto-push (default 30s) */
  startAutoPush(intervalMs = 30_000) {
    if (this.pushInterval) clearInterval(this.pushInterval);
    this.pushInterval = setInterval(() => this.pushSnapshot(), intervalMs);
    logger.info(`📡 Auto-push enabled for metrics every ${intervalMs / 1000}s`);
  }

  stopAutoPush() {
    if (this.pushInterval) clearInterval(this.pushInterval);
    this.pushInterval = null;
  }
}

/** Default singleton for backward compatibility */
export const metrics = new Metrics();
