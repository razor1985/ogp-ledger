export async function pbftConsensus(tx) {
    // Simulated PBFT consensus (can later integrate with actual validators)
    console.log("🧠 PBFT validating:", tx);
    await new Promise(r => setTimeout(r, 200));
    return true; // accept all for prototype
  }
  