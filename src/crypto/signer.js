import CryptoJS from "crypto-js";

export function signData(data, privateKey) {
  const payload = JSON.stringify(data);
  return CryptoJS.HmacSHA256(payload, privateKey).toString();
}

export function verifySignature(data, signature, publicKey) {
  const expected = signData(data, publicKey);
  return expected === signature;
}
