🪙 OGP-Ledger

A blockchain + cryptocurrency service fabric built on top of OGP.

📦 Installation

npm install ogp-ledger


⚙️ Server Setup
import { LedgerServer } from 'ogp-ledger';
const server = new LedgerServer({ orgId: 'BankA', region: 'us-east-1' });
server.start();

💳 Client Example
import { LedgerClient } from 'ogp-ledger';

const client = new LedgerClient({ orgId: 'UserA', privateKey: 'abc123' });
await client.mint('UserA', 1000);
await client.transfer('UserB', 200);

🔍 Features
Feature	Description
No miners	Consensus handled by OGP PBFT nodes
Schema-based validation	Transactions follow ledger_v1.json
Cross-region AWS Fabric	Works with OGP Fabric across US/EU/AP regions
Encryption built-in	Uses OGP channel-level ECDH or PSK encryption
Customizable consensus	Plug in PBFT, RAFT, or OGP async-quorum
High throughput	Sub-100 ms confirmation latency
Multi-currency ready	Extend schema for different token types

⚡ Summary
Layer	Package	Function
Networking / Routing	ogp-services-node	Secure message transport
Client API	ogp-services-client	Wallet / DApp layer
Ledger / Crypto	ogp-ledger	Adds mint, transfer, verify, consensus logic
Consensus	Internal PBFT/RAFT modules	Fast event-driven validation


# @razor1985/ogp-ledger

### Minerless Blockchain and Consensus Layer for the **Organization Gateway Protocol (OGP)**

---

## 🌍 Overview

`@razor1985/ogp-ledger` is a **distributed, minerless blockchain framework** designed around the **Organization Gateway Protocol (OGP)** architecture.  
It replaces traditional Proof-of-Work (PoW) and Proof-of-Stake (PoS) mechanisms with **PBFT** and **Raft** consensus, delivering **instant finality**, **zero mining cost**, and **energy-efficient validation**.

It is the **core consensus and ledger engine** of the OGP ecosystem.

---

## ⚙️ Core Features

| Feature | Description |
|----------|-------------|
| **Ed25519 Digital Signatures** | Modern cryptography for block and transaction authentication |
| **SHA3-512 Hashing** | Stronger than SHA-256 for tamper-proof integrity |
| **PBFT & Raft Consensus Engines** | Minerless validator-based agreement models |
| **Immutable Blockchain** | Each block cryptographically linked to its predecessor |
| **Instant Finality** | No PoW delay — block seals immediately after consensus |
| **LedgerDB Persistence** | Backed by [`@razor1985/ogp-ledgerdb`](https://github.com/razor1985/ogp-ledgerdb) for durable, scalable storage |
| **Region-Aware Replication** | Cross-region OGP Fabric sync and acknowledgment |
| **Merkle Root Verification** | Ensures transaction integrity within each block |
| **Crash Recovery & Rollback** | Built-in replay, snapshot, and rollback capabilities |
| **Smart Energy Profile** | Lightweight, green, and ready for enterprise workloads |

---

## 🧩 Architecture Layers
OGP Ledger
│
├── core/
│ ├── blockchain.js → Ledger logic, PBFT/Raft hooks
│ └── block.js → Block definition, hash & signature validation
│
├── crypto/
│ └── ed25519.js → Deterministic digital signature system
│
├── storage/
│ └── persistence.js → Interface to @razor1985/ogp-ledgerdb
│
├── utils/
│ └── logger.js → Structured logging
│
└── test/
└── blockchain.integrity.test.js


---

## 🛠️ Installation

```bash
npm install @razor1985/ogp-ledger

import { Blockchain } from "@razor1985/ogp-ledger";
import { Ed25519 } from "@razor1985/ogp-ledger/crypto/ed25519.js";

(async () => {
  const ledger = new Blockchain();
  await ledger.initialize();

  const { publicKey, privateKey } = Ed25519.generateKeyPair();

  const tx = {
    from: "alice",
    to: "bob",
    amount: 10,
    timestamp: Date.now(),
    signature: Ed25519.sign({ from: "alice", to: "bob", amount: 10 }, privateKey),
    publicKey,
  };

  await ledger.addTransaction(tx);
  await ledger.commitBlock([
    Ed25519.signAsValidator("orgA-validator", "block-hash", privateKey, publicKey),
  ]);

  console.log(ledger.getLedgerSummary());
})();

🧱 Integration with OGP Fabric

When used with @razor1985/ogp-fabricController

| Layer                  | Mechanism                               |
| ---------------------- | --------------------------------------- |
| Transport              | OGP Fabric AES-GCM secured channels     |
| Authentication         | Ed25519 key pairs per organization node |
| Block integrity        | SHA3-512 hashing + validator signatures |
| Transaction validation | Ed25519 verification + balance replay   |
| Replication            | Cross-region ACK + hash verification    |


# @razor1985/ogp-ledger

**OGP Ledger v3.6** — Minerless, enterprise-grade blockchain fabric built on  
[`@razor1985/ogp-fabricController`](https://github.com/razor1985/ogp-fabricController)  
and [`@razor1985/ogp-ledgerdb`](https://github.com/razor1985/ogp-ledgerdb).

---

## 🌍 Overview

OGP Ledger provides a fully decentralized yet minerless blockchain layer with:
- ✅ PBFT / Raft consensus
- ✅ Multi-region replication via Fabric Replicator 35
- ✅ AES-256 GCM ledger encryption with key rotation
- ✅ Circuit-breaker resilience & auto recovery
- ✅ Real-time telemetry through Watchtower
- ✅ Snapshot & checkpoint support for instant recovery

---

## 🧱 Architecture
               ┌─────────────────────────────┐
               │ Central Mgmt / Watchtower UI│
               └────────────┬────────────────┘
                            │ Telemetry / Alerts
                 ┌──────────┴──────────┐
                 │     Fabric Broker   │
                 └──────────┬──────────┘
    ┌───────────────────────┼────────────────────────┐
    │                       │                        │
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Ledger Node A│ │ Ledger Node B│ │ Ledger Node C│
│ (us-east-1) │ │ (us-west-2) │ │ (eu-central)│
│ ───────────── │ │ ─────────────│ │ ─────────────│
│ PBFT / Raft │◄──────►│ FabricReplic │◄──────►│ FabricReplic │
│ LedgerDB │ │ LedgerDB │ │ LedgerDB │
└──────────────┘ └──────────────┘ └──────────────┘

---

## ⚙️ Installation

```bash
npm install @razor1985/ogp-ledger
MODE=dev CONSENSUS_MODE=pbft node src/index.js

Environment variables
| Variable         | Description                                    | Default       |
| ---------------- | ---------------------------------------------- | ------------- |
| `MODE`           | Runtime mode (`dev`, `staging`, `prod`)        | `dev`         |
| `CONSENSUS_MODE` | `pbft` or `raft`                               | `pbft`        |
| `ADAPTER`        | LedgerDB adapter (`postgres`, `rocksdb`, `s3`) | `postgres`    |
| `ORG_ID`         | Organization identifier                        | `default-org` |
| `REGION`         | Deployment region                              | `local`       |
| `HEADLESS`       | Run without LedgerServer (for Mgmt UI)         | `false`       |

🧩 Key Components
| Module                 | Responsibility                                          |
| ---------------------- | ------------------------------------------------------- |
| **Blockchain**         | Core ledger state machine with snapshot & LedgerDB sync |
| **PBFT / Raft**        | Consensus engines for validator agreement               |
| **FabricReplicator35** | Multi-region block replication                          |
| **LedgerDBService**    | Encrypted persistence layer                             |
| **WatchtowerHooks**    | Telemetry stream for UI                                 |
| **CircuitBreaker**     | Failure isolation & auto recovery                       |
| **MetricsCollector**   | Real-time TPS / block metrics                           |

🧪 Testing
node test/ledger.replication.test.js
node test/pbft.viewchange.test.js

🧰 Developer Notes
Uses OGP Fabric for transport — no HTTPS, JWT, or REST needed.
All communication is signed & encrypted using Ed25519 + AES-GCM.
Each node is self-validating and can operate offline until re-sync.
Designed for multi-tenant, region-aware blockchains.



# Rotate validator keys every 24 hours (or per policy)
KEY_ROTATION_INTERVAL_HOURS=24
KEY_GRACE_PERIOD_MINUTES=15
KEY_DIR=./keys
