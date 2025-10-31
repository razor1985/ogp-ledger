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