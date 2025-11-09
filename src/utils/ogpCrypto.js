// src/utils/ogpCrypto.js
// -----------------------------------------------------------------------------
// Universal crypto bridge for OGP Fabric (built on top of @razor1985/ogp-client)
// -----------------------------------------------------------------------------

import { OGPClient, AesGcmProvider } from "@razor1985/ogp-client";
import { webcrypto as crypto } from "crypto";

// Node compatibility: expose webcrypto for OGPClient
globalThis.crypto = crypto;

// -----------------------------------------------------------------------------
// Initialize OGPClient instance for encryption/decryption
// -----------------------------------------------------------------------------
const PSK = process.env.OGP_PSK || "bXktbG9jYWwtc2VjcmV0LWtleQ"; // base64url dev key
const key = new Uint8Array(Buffer.from(PSK, "base64url"));

const client = new OGPClient({
  edgeUrl: process.env.OGP_EDGE_URL || "https://edge.pixelcomet.in/__ogp__/invoke",
  env: process.env.MODE || "dev",
  transport: { secure: true },
  crypto: AesGcmProvider(key),
});

// -----------------------------------------------------------------------------
// Unified helpers used by PBFT and Fabric modules
// -----------------------------------------------------------------------------

/**
 * Simulated signing function (since @razor1985/ogp-client uses symmetric AES-GCM).
 * In PBFT context, we just use AES key ID and org ID for traceability.
 */
export function ogpSign(data) {
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return {
    sig: encoded.slice(0, 24),
    kid: "ogp-psk-v1",
    org: process.env.ORG_ID || "local-org",
  };
}

/** Verifies integrity by structure only (mock verifier for symmetric crypto) */
export function ogpVerify(signatureObj) {
  return signatureObj && signatureObj.kid && signatureObj.sig;
}

/** Encrypt message payload using OGPClient’s AES-GCM provider */
export function ogpEncrypt(message) {
  return client.crypto.encrypt(JSON.stringify(message));
}

/** Decrypt message payload using OGPClient’s AES-GCM provider */
export function ogpDecrypt(payload) {
  const decrypted = client.crypto.decrypt(payload);
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}
