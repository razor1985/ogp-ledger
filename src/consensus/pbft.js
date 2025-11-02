// src/consensus/pbft.js
import crypto from "crypto";
import { Ed25519 } from "../crypto/ed25519.js";
import { getFabric } from "../fabric/broker.js";
import { OGPIdentity } from "@razor1985/ogp-client";
import logger from "../utils/logger.js";


/**
 * PBFT engine with validator-signature embedding.
 *  - mock mode → local simulation
 *  - production → signed message exchange via OGP Fabric
 */
export class PBFT {
  constructor({
    mock = true,
    nodeId = "validator-1",
    peers = [],
    privateKey = null,
  } = {}) {
    this.mock = mock;
    this.nodeId = nodeId;
    this.peers = peers;
    this.privateKey = privateKey;
    this.validatorSignatures = []; // populated during consensus
  }

  async reachConsensus(tx) {
    if (this.mock) return this.#mockConsensus(tx);
    return this.#realConsensus(tx);
  }

  /* ---------------- MOCK ---------------- */
  async #mockConsensus(tx) {
    console.log("⚙️  Running PBFT consensus (mock)...");
    console.log("🟡 PBFT Phase: pre-prepare");
    console.log("📡 PBFT broadcast: prepare", tx);
    console.log("🟠 PBFT Phase: prepare");
    console.log("📡 PBFT broadcast: commit", tx);
    console.log("🟢 PBFT Phase: commit — consensus achieved!");

    // generate synthetic validator signatures
    this.validatorSignatures = [
      { validatorId: this.nodeId, signature: "mock-sig-" + Date.now() },
      ...this.peers.map((p, i) => ({
        validatorId: p.id || `peer-${i + 1}`,
        signature: "mock-sig-" + (Date.now() + i),
      })),
    ];
    return true;
  }

  /* ---------------- PRODUCTION ---------------- */
  async #realConsensus(tx) {
    const digest = this.#hash(JSON.stringify(tx));
    const mySig = Ed25519.sign(digest, this.privateKey);
    this.validatorSignatures = [{ validatorId: this.nodeId, signature: mySig }];

    console.log("⚙️  PBFT pre-prepare → broadcast to peers");
    await this.#broadcast({ type: "pre-prepare", digest, signature: mySig });

    const prepares = await this.#collect("prepare", digest);
    const commits = await this.#collect("commit", digest);

    const quorum = this.#quorum();
    if (prepares.length >= quorum && commits.length >= quorum) {
      console.log("🟢 PBFT consensus achieved with quorum signatures");
      this.validatorSignatures.push(...prepares.map(p => ({
        validatorId: p.nodeId,
        signature: p.signature,
      })));
      this.validatorSignatures.push(...commits.map(c => ({
        validatorId: c.nodeId,
        signature: c.signature,
      })));
      return true;
    }
    console.warn("⚠️  Consensus failed — insufficient signatures");
    return false;
  }

   async function broadcastPBFTMessage(topic, message) {
    const fabric = getFabric();
    const signed = {
      signer: OGPIdentity.sign(message),
      payload: OGPIdentity.encrypt(message),
    };
    await fabric.publish(topic, signed);
    logger.info(`[Fabric] Published ${topic}`);
  }
  

  async #collect(type, digest) {
    // placeholder for OGP Fabric subscription
    const arr = [];
    for (const peer of this.peers) {
      const sig = this.mock
        ? "mock-sig"
        : Ed25519.sign(digest, this.privateKey);
      arr.push({ nodeId: peer.id, digest, type, signature: sig });
    }
    return arr;
  }

  export async function setupPBFTListeners() {
    const fabric = getFabric();
    const topics = ["pbft.prepare", "pbft.commit"];
  
    topics.forEach((topic) => {
      fabric.subscribe(topic, (msg) => {
        try {
          const verified = OGPIdentity.verify(msg.signer);
          if (!verified) throw new Error("Invalid signature");
          const payload = OGPIdentity.decrypt(msg.payload);
          logger.info(`[Fabric] Received ${topic}`, payload);
          handlePBFTMessage(topic, payload);
        } catch (err) {
          logger.error(`Error handling ${topic}:`, err.message);
        }
      });
    });
  }

  
  #hash(d) {
    return crypto.createHash("sha3-512").update(d).digest("hex");
  }

  #quorum() {
    const n = Math.max(this.peers.length + 1, 4);
    return Math.floor((2 * n) / 3);
  }
}
