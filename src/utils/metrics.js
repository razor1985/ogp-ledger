/**
 * utils/metrics.js
 * --------------------------------------------------
 * Enhanced Unified Metrics Collector for OGP Fabric & Ledger
 * --------------------------------------------------
 * Supports:
 *   - Counters (incremental)
 *   - Gauges (current values)
 *   - Histograms (statistical distributions)
 *   - Timers (duration measurements)
 *   - Snapshot aggregation for Watchtower
 *   - Push hooks for FabricReplicator and LedgerDB
 */

import logger from "./logger.js";

export class Metrics {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.timers = new Map();
    this.labels = new Map(); // For labeled metrics
  }

  /** 
   * Increment a counter (default +1)
   * Alias: .increment()
   */
  inc(name, by = 1, labels = {}) {
    const key = this._getKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + by);
    return this; // Chainable
  }

  /** Alias for inc() */
  increment(name, by = 1, labels = {}) {
    return this.inc(name, by, labels);
  }

  /** 
   * Set a gauge (current reading)
   * Alias: .gauge()
   */
  set(name, val, labels = {}) {
    const key = this._getKey(name, labels);
    this.gauges.set(key, val);
    return this; // Chainable
  }

  /** Alias for set() */
  gauge(name, val, labels = {}) {
    return this.set(name, val, labels);
  }

  /** 
   * Record a histogram value for statistical analysis
   * Useful for percentiles, averages, etc.
   */
  histogram(name, value, labels = {}) {
    const key = this._getKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        values: [],
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity
      });
    }
    
    const hist = this.histograms.get(key);
    hist.values.push(value);
    hist.sum += value;
    hist.count++;
    hist.min = Math.min(hist.min, value);
    hist.max = Math.max(hist.max, value);
    
    return this;
  }

  /** 
   * Start a timer - returns a function to call when done
   * Usage: const end = metrics.timer('operation'); ... end();
   */
  timer(name, labels = {}) {
    const key = this._getKey(name, labels);
    const start = process.hrtime.bigint();
    
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
      this.histogram(`${name}_duration`, duration, labels);
      this.inc(`${name}_calls`, 1, labels);
      return duration;
    };
  }

  /** 
   * Measure async function execution time
   */
  async timeAsync(name, fn, labels = {}) {
    const endTimer = this.timer(name, labels);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.inc(`${name}_errors`, 1, labels);
      throw error;
    }
  }

  /** 
   * Decrement a gauge value
   */
  dec(name, by = 1, labels = {}) {
    const key = this._getKey(name, labels);
    const current = this.gauges.get(key) || 0;
    this.gauges.set(key, current - by);
    return this;
  }

  /** 
   * Set gauge to maximum of current and new value
   */
  max(name, value, labels = {}) {
    const key = this._getKey(name, labels);
    const current = this.gauges.get(key);
    if (current === undefined || value > current) {
      this.gauges.set(key, value);
    }
    return this;
  }

  /** 
   * Set gauge to minimum of current and new value
   */
  min(name, value, labels = {}) {
    const key = this._getKey(name, labels);
    const current = this.gauges.get(key);
    if (current === undefined || value < current) {
      this.gauges.set(key, value);
    }
    return this;
  }

  /** 
   * Reset a specific metric or all metrics
   */
  reset(name = null) {
    if (name === null) {
      this.counters.clear();
      this.gauges.clear();
      this.histograms.clear();
      this.timers.clear();
    } else {
      // Reset all metrics with this name (including labeled versions)
      for (const key of this.counters.keys()) {
        if (key.startsWith(`${name}|`)) this.counters.delete(key);
      }
      for (const key of this.gauges.keys()) {
        if (key.startsWith(`${name}|`)) this.gauges.delete(key);
      }
      for (const key of this.histograms.keys()) {
        if (key.startsWith(`${name}|`)) this.histograms.delete(key);
      }
    }
    return this;
  }

  /** 
   * Get current value of a metric
   */
  get(name, type = 'counter', labels = {}) {
    const key = this._getKey(name, labels);
    switch (type) {
      case 'counter':
        return this.counters.get(key) || 0;
      case 'gauge':
        return this.gauges.get(key);
      case 'histogram':
        return this.histograms.get(key);
      default:
        return undefined;
    }
  }

  /** 
   * Fetch enhanced snapshot with histograms and statistics
   */
  snapshot() {
    const histogramStats = {};
    
    for (const [key, hist] of this.histograms) {
      const sorted = hist.values.sort((a, b) => a - b);
      histogramStats[key] = {
        ...hist,
        avg: hist.sum / hist.count,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
      ts: Date.now(),
    };
  }

  /** 
   * Internal method to create labeled metric keys
   */
  _getKey(name, labels = {}) {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `${name}|${labelString}`;
  }
}

/**
 * Enhanced MetricsCollector with additional capabilities
 */
export class MetricsCollector extends Metrics {
  constructor({ 
    orgId = "unknown", 
    region = "unknown", 
    nodeId = "unknown",
    autoPush = false,
    retentionPeriod = 300000, // 5 minutes
    maxSamples = 1000 // max samples per histogram
  } = {}) {
    super();
    this.orgId = orgId;
    this.region = region;
    this.nodeId = nodeId;
    this.autoPush = autoPush;
    this.retentionPeriod = retentionPeriod;
    this.maxSamples = maxSamples;
    this.pushInterval = null;
    this._cleanupInterval = null;
    this._startCleanup();
  }

  /** Enhanced record with automatic type detection */
  record(event, value = 1, labels = {}) {
    if (typeof value === 'number') {
      // If value is 1, treat as counter, otherwise as gauge
      if (value === 1) {
        this.inc(event, value, labels);
      } else {
        this.set(event, value, labels);
      }
    }
    logger.debug(`📊 Metric recorded: ${event}=${value}`, { labels });
    return this;
  }

  /** Batch record multiple metrics */
  recordBatch(metrics) {
    for (const metric of metrics) {
      const { name, value, type = 'counter', labels = {} } = metric;
      switch (type) {
        case 'counter':
          this.inc(name, value, labels);
          break;
        case 'gauge':
          this.set(name, value, labels);
          break;
        case 'histogram':
          this.histogram(name, value, labels);
          break;
      }
    }
    return this;
  }

  /** Enhanced snapshot with node context */
  snapshot() {
    const baseSnapshot = super.snapshot();
    return {
      ...baseSnapshot,
      meta: {
        orgId: this.orgId,
        region: this.region,
        nodeId: this.nodeId,
        version: '2.0' // Enhanced metrics version
      }
    };
  }

  /** Attach with enhanced capabilities */
  attachTo(watchtowerOrFabric, options = {}) {
    if (!watchtowerOrFabric || typeof watchtowerOrFabric.push !== "function") return;
    
    this.pushTarget = watchtowerOrFabric;
    this.pushOptions = options;
    
    if (this.autoPush) {
      this.startAutoPush(options.intervalMs);
    }
    
    logger.info(`📡 Metrics attached to ${watchtowerOrFabric.constructor.name}`);
    return this;
  }

  /** Enhanced push with error handling */
  pushSnapshot() {
    try {
      const snap = this.snapshot();
      snap.orgId = this.orgId;
      snap.region = this.region;
      snap.nodeId = this.nodeId;

      if (this.pushTarget?.push) {
        this.pushTarget.push(snap, this.pushOptions);
        logger.debug(`📡 Metrics pushed → ${this.pushTarget.constructor.name}`);
      } else {
        logger.debug("📊 Local Enhanced Metrics Snapshot:", snap);
      }
      return snap;
    } catch (error) {
      logger.error("Failed to push metrics snapshot:", error);
      return null;
    }
  }

  /** Start automatic cleanup of old histogram samples */
  _startCleanup() {
    this._cleanupInterval = setInterval(() => {
      this._cleanupOldSamples();
    }, this.retentionPeriod / 2);
  }

  /** Cleanup old histogram samples */
  _cleanupOldSamples() {
    const now = Date.now();
    for (const [key, hist] of this.histograms) {
      // Limit number of samples
      if (hist.values.length > this.maxSamples) {
        hist.values = hist.values.slice(-this.maxSamples);
      }
    }
  }

  /** Stop cleanup interval */
  stop() {
    this.stopAutoPush();
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

/** Enhanced singleton for backward compatibility */
export const metrics = new MetricsCollector({
  orgId: process.env.ORG_ID || 'default',
  region: process.env.REGION || 'unknown',
  nodeId: process.env.NODE_ID || 'singleton'
});