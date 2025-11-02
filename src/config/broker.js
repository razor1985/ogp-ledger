import { FabricBroker } from "@razor1985/ogp-services-node";
import { OGPIdentity } from "@razor1985/ogp-client";
import fabricConfig from "../config/fabric.js";
import logger from "../utils/logger.js";

let fabric;

export async function initFabric() {
  const { transport, orgId, privateKeyPath, region, brokerUrl } = fabricConfig;

  logger.info(`Starting Fabric using ${transport} @ ${brokerUrl}`);

  fabric = new FabricBroker({
    transport,
    orgId,
    privateKeyPath,
    region,
    brokerUrl,
  });

  await fabric.connect();

  await fabric.registerService({
    org: orgId,
    service: "ledger-validator",
    version: "1.0.0",
    endpoints: ["pbft.prepare", "pbft.commit", "ledger.alert"],
  });

  logger.info(`Fabric connected and registered as ${orgId}`);
  return fabric;
}

export function getFabric() {
  if (!fabric) throw new Error("Fabric not initialized");
  return fabric;
}
