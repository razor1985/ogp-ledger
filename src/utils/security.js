import crypto from "crypto";
const rateMap = new Map();

export function createNonce() {
  return crypto.randomBytes(12).toString("hex");
}

export function rateLimit(orgId, limit = 25, windowMs = 1000) {
  const now = Date.now();
  const record = rateMap.get(orgId) || { count: 0, ts: now };
  if (now - record.ts > windowMs) { record.count = 0; record.ts = now; }
  if (++record.count > limit) return false;
  rateMap.set(orgId, record);
  return true;
}
