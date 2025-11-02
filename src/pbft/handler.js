import { fabric } from "../fabric/broker.js";
import logger from "../utils/logger.js";
import { updatePBFTState } from "./state.js";
import { PBFT_TOPICS } from "../fabric/topics.js";

export async function setupPBFTListeners() {
  PBFT_TOPICS.forEach(topic => {
    fabric.subscribe(topic, (payload, org) => {
      logger.info(`[PBFT] ${topic} from ${org}`, payload);
      updatePBFTState(topic, payload);
    });
  });
}

export async function broadcastPBFT(topic, message) {
  await fabric.publish(topic, message);
}
