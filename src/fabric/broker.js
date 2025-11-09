// src/fabric/broker.js
// -----------------------------------------------------------------------------
// OGP Fabric Broker
// -----------------------------------------------------------------------------
// Handles message publishing, subscriptions, and signature verification for
// inter-node communication over the OGP Fabric network. Used by PBFT, Ledger,
// and Discovery services.
// -----------------------------------------------------------------------------

import { signPacket, verifyPacket, sendOGPPacket } from "@razor1985/ogp-services-node";
import fabricConfig from "../config/fabric.js";
import { createNonce, rateLimit } from "../utils/security.js";
import logger from "../utils/logger.js";
import { ALL_TOPICS } from "./topics.js";
import { registerService } from "./registry.js";

/**
 * FabricBroker
 * -------------
 * Provides unified publish/subscribe interface over OGP network.
 * Uses signed packets via @razor1985/ogp-services-node.
 */
export class FabricBroker {
  constructor() {
    this.orgId = fabricConfig.orgId || process.env.ORG_ID || "local-org";
    this.transport = fabricConfig.transport || "ws";
    this.region = fabricConfig.region || "us-east-1";
    this.brokerUrl = fabricConfig.brokerUrl || "ws://localhost:9080/inbox";
    this.handlers = new Map();
    this.connected = false;
  }

  /** Establish connection to broker (idempotent) */
  async connect() {
    if (this.connected) return;
    logger.info(`[FabricBroker] Connected via ${this.transport} → ${this.brokerUrl}`);
    this.connected = true;
  }

  /** Register a service under this organization */
  async register(info) {
    registerService(info);
    logger.info(`[FabricBroker] Service registered`, info);
  }

  /** Subscribe to a topic with a callback handler */
  subscribe(topic, handler) {
    this.handlers.set(topic, handler);
    logger.info(`[FabricBroker] Subscribed → ${topic}`);
  }

  /** Publish a signed, rate-limited message */
  async publish(topic, payload) {
    if (!rateLimit(this.orgId)) {
      logger.warn(`[FabricBroker] ⚠️ Rate-limit hit for ${this.orgId}`);
      return;
    }

    const packet = signPacket({
      topic,
      payload,
      org: this.orgId,
      nonce: createNonce(),
      ts: Date.now(),
    });

    try {
      await sendOGPPacket(this.brokerUrl, packet);
      logger.info(`[FabricBroker] Published ${topic}`);
    } catch (err) {
      logger.error(`[FabricBroker] ❌ Failed to publish ${topic}: ${err.message}`);
    }
  }

  /** Handle an incoming signed packet */
  async handleIncoming(packet) {
    try {
      const verified = verifyPacket(packet);
      if (!verified.valid) {
        logger.error(`[FabricBroker] Invalid signature from ${verified.org}`);
        return;
      }

      const handler = this.handlers.get(packet.topic);
      if (handler) {
        logger.info(`[FabricBroker] 📥 Handling topic → ${packet.topic}`);
        await handler(packet.payload, verified.org);
      } else {
        logger.warn(`[FabricBroker] ⚠️ No handler registered for ${packet.topic}`);
      }
    } catch (err) {
      logger.error(`[FabricBroker] Error processing packet: ${err.message}`);
    }
  }

  /** Graceful shutdown */
  async disconnect() {
    this.handlers.clear();
    this.connected = false;
    logger.info(`[FabricBroker] 🔌 Disconnected`);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧩 Shared instance + helper export (for PBFT & other modules)               */
/* -------------------------------------------------------------------------- */

/** Shared singleton instance */
export const fabric = new FabricBroker();

/** Helper function for backward compatibility */
export function getFabric() {
  return fabric;
}

/** Default export for convenience */
export default fabric;
