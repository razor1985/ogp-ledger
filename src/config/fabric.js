import dotenv from "dotenv";
dotenv.config();

export default {
  transport: process.env.OGP_TRANSPORT || "quic",
  orgId: process.env.OGP_ORG_ID,
  privateKeyPath: process.env.OGP_PRIVATE_KEY_PATH,
  region: process.env.OGP_REGION || "us-east-1",
  brokerUrl: process.env.OGP_FABRIC_BROKER_URL || "http://localhost:9080/inbox",
};
