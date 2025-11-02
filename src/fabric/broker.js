import { signPacket, verifyPacket, sendOGPPacket } from "@razor1985/ogp-services-node";
import fabricConfig from "../config/fabric.js";
import { createNonce, rateLimit } from "../utils/security.js";
import logger from "../utils/logger.js";
import { ALL_TOPICS } from "./topics.js";
import { registerService } from "./registry.js";

export class FabricBroker {
  constructor() {
    this.orgId = fabricConfig.orgId;
    this.transport = fabricConfig.transport;
    this.region = fabricConfig.region;
    this.brokerUrl = fabricConfig.brokerUrl;
    this.handlers = new Map();
  }

  async connect() {
    logger.info(`[FabricBroker] Connected via ${this.transport} → ${this.brokerUrl}`);
  }

  async register(info) {
    registerService(info);
    logger.info(`[FabricBroker] Service registered`, info);
  }

  subscribe(topic, handler) {
    this.handlers.set(topic, handler);
    logger.info(`[FabricBroker] Subscribed → ${topic}`);
  }

  async publish(topic, payload) {
    if (!rateLimit(this.orgId)) {
      logger.warn(`[FabricBroker] rate-limit hit for ${this.orgId}`);
      return;
    }
    const packet = signPacket({
      topic,
      payload,
      org: this.orgId,
      nonce: createNonce(),
      ts: Date.now(),
    });
    await sendOGPPacket(this.brokerUrl, packet);
    logger.info(`[FabricBroker] Published ${topic}`);
  }

  async handleIncoming(packet) {
    const verified = verifyPacket(packet);
    if (!verified.valid) {
      logger.error(`[FabricBroker] Invalid signature from ${verified.org}`);
      return;
    }
    const handler = this.handlers.get(packet.topic);
    if (handler) handler(packet.payload, verified.org);
    else logger.warn(`[FabricBroker] No handler for ${packet.topic}`);
  }
}

export const fabric = new FabricBroker();
