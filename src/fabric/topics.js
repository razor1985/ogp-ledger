// ──────────────────────────────
// Consensus (PBFT / Raft / Validator)
// ──────────────────────────────
export const PBFT_TOPICS = [
    "pbft.preprepare",        // ✅ Stage 2.2
    "pbft.prepare",           // ✅
    "pbft.commit",            // ✅
    "pbft.viewchange",        // ✅
    "pbft.checkpoint",        // ✅
    "pbft.recover",           // ✅
    "pbft.sync",              // ✅
    "pbft.timeout",           // 💡 detect slow validator
    "pbft.rollback",          // 💡 soft-rollback consensus
    "pbft.state.snapshot",    // 💡 share current consensus state
    "pbft.state.restore",     // 💡 recover state from snapshot
    "pbft.reconfig",          // 💡 dynamic cluster resizing
  ];
  
  // ──────────────────────────────
  // Ledger / Blockchain / Smart Contract Execution
  // ──────────────────────────────
  export const LEDGER_TOPICS = [
    "ledger.block.added",         // ✅
    "ledger.block.verified",      // ✅
    "ledger.tx.submitted",        // ✅
    "ledger.tx.confirmed",        // ✅
    "ledger.audit",               // ✅
    "ledger.alert",               // ✅
    "ledger.block.reorg",         // 💡 fork resolution
    "ledger.snapshot.created",    // 💡 checkpoint export
    "ledger.snapshot.loaded",     // 💡 checkpoint import
    "ledger.contract.deploy",     // 💡 smart contract deployment
    "ledger.contract.invoke",     // 💡 smart contract call
    "ledger.contract.event",      // 💡 emitted event
    "ledger.gas.update",          // 💡 fee schedule updates
    "ledger.reward.distribute",   // 💡 validator rewards
    "ledger.slash.event",         // 💡 penalty events
  ];
  
  // ──────────────────────────────
  // Fabric Infrastructure / Service Mesh
  // ──────────────────────────────
  export const FABRIC_TOPICS = [
    "fabric.node.join",          // ✅
    "fabric.node.leave",         // ✅
    "fabric.node.heartbeat",     // ✅
    "fabric.discovery.update",   // ✅
    "fabric.broker.status",      // ✅
    "fabric.region.switch",      // 💡 cross-region migration
    "fabric.mesh.rebalance",     // 💡 dynamic load balancing
    "fabric.health.check",       // 💡 health probes
    "fabric.route.trace",        // 💡 packet tracing
    "fabric.service.register",   // 💡 register new app service
    "fabric.service.deregister", // 💡 remove app service
    "fabric.topology.map",       // 💡 full mesh topology broadcast
  ];
  
  // ──────────────────────────────
  // Identity / Security / Governance
  // ──────────────────────────────
  export const IDENTITY_TOPICS = [
    "identity.sync",             // ✅
    "identity.key.rotate",       // ✅
    "identity.cert.update",      // ✅
    "identity.revocation",       // 💡 revoke key/cert
    "identity.org.join",         // 💡 new organization onboard
    "identity.org.leave",        // 💡 org removed
    "identity.org.policy",       // 💡 org-level access policy
    "identity.access.request",   // 💡 permission negotiation
    "identity.audit.log",        // 💡 key-use audit trail
    "identity.mfa.challenge",    // 💡 optional human auth
  ];
  
  // ──────────────────────────────
  // System / Telemetry / Analytics
  // ──────────────────────────────
  export const SYSTEM_TOPICS = [
    "system.metrics",            // ✅
    "system.alert",              // ✅
    "system.shutdown",           // ✅
    "system.recover",            // ✅
    "system.log.rotate",         // 💡
    "system.upgrade.available",  // 💡
    "system.upgrade.apply",      // 💡
    "system.env.update",         // 💡
    "system.time.sync",          // 💡
    "system.latency.stats",      // 💡
  ];
  
  // ──────────────────────────────
  // Governance / Policy / Voting Layer
  // ──────────────────────────────
  export const GOVERNANCE_TOPICS = [
    "govern.vote.proposal",      // 💡 governance proposal
    "govern.vote.cast",          // 💡 submit vote
    "govern.vote.result",        // 💡 announce results
    "govern.treasury.allocate",  // 💡 treasury disbursement
  ];
  
  // ──────────────────────────────
  // Application / Service Layer Bridge
  // ──────────────────────────────
  export const APP_TOPICS = [
    "app.request",               // 💡 generic app invocation
    "app.response",              // 💡
    "app.session.start",         // 💡
    "app.session.end",           // 💡
    "app.file.upload",           // 💡
    "app.file.download",         // 💡
    "app.chat.message",          // 💡 chat via fabric
    "app.video.session",         // 💡 video stream signaling
    "app.payment.initiate",      // 💡
    "app.payment.confirm",       // 💡
    "app.analytics.event",       // 💡 app telemetry
  ];
  
  // ──────────────────────────────
  // Combine Everything
  // ──────────────────────────────
  export const ALL_TOPICS = [
    ...PBFT_TOPICS,
    ...LEDGER_TOPICS,
    ...FABRIC_TOPICS,
    ...IDENTITY_TOPICS,
    ...SYSTEM_TOPICS,
    ...GOVERNANCE_TOPICS,
    ...APP_TOPICS,
  ];
  