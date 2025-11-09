export function validateConfig(cfg) {
    const required = ["orgId"];
    for (const r of required) if (!cfg[r]) throw new Error(`Missing config: ${r}`);
    return true;
  }
  