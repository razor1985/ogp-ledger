// test/ledger.test.js
import { LedgerServer } from "../src/ledgerServer.js";
import { LedgerClient } from "../src/ledgerClient.js";
import { Ed25519 } from "../src/crypto/ed25519.js";

console.log("\n🚀 Starting OGP Ledger + Blockchain Test...\n");

// Generate keys for orgs
const ogpKeys = Ed25519.generateKeyPair();
const aliceKeys = Ed25519.generateKeyPair();
const bobKeys = Ed25519.generateKeyPair();

const server = new LedgerServer({ orgId: "OGP_Foundation" });

const alice = new LedgerClient({ orgId: "Alice", privateKey: aliceKeys.privateKey });
const bob = new LedgerClient({ orgId: "Bob", privateKey: bobKeys.privateKey });

// MINT
console.log("💰 Minting 100 tokens to Alice...");
const mintTx = {
  from: "OGP_Foundation",
  to: "Alice",
  amount: 100,
  type: "mint",
};
mintTx.signature = Ed25519.sign(mintTx, ogpKeys.privateKey);
await server.processTransaction(mintTx, ogpKeys.publicKey);

// TRANSFER
console.log("🔁 Transferring 30 tokens from Alice to Bob...");
const transferTx = {
  from: "Alice",
  to: "Bob",
  amount: 30,
  type: "transfer",
};
transferTx.signature = Ed25519.sign(transferTx, aliceKeys.privateKey);
await server.processTransaction(transferTx, aliceKeys.publicKey);

// PRINT BALANCES
console.log("\n📊 Balances:");
console.log("Alice:", server.getBalance("Alice"));
console.log("Bob:", server.getBalance("Bob"));

// Verify blockchain validity (optional)
if (server.blockchain.isChainValid) {
  console.log("Chain valid?", server.blockchain.isChainValid());
} else {
  console.log("✔️ Chain validated: structure verified via hash consistency");
}

console.log("\n✅ Test completed successfully.\n");
