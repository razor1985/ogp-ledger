import { LedgerServer } from '../src/ledgerServer.js';
import { LedgerClient } from '../src/ledgerClient.js';

const server = new LedgerServer({ orgId: "OGP_Foundation" });
await server.start();

const alice = new LedgerClient({ orgId: "Alice", privateKey: "keyA" });
const bob = new LedgerClient({ orgId: "Bob", privateKey: "keyB" });

await alice.mint("Alice", 100);
await alice.transfer("Bob", 20);

console.log("Bob balance:", server.getBalance("Bob"));
