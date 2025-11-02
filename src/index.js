import { fabric } from "./fabric/broker.js";
import { setupPBFTListeners, broadcastPBFT } from "./pbft/handler.js";
import logger from "./utils/logger.js";

(async () => {
  await fabric.connect();
  await fabric.register({
    org: fabric.orgId,
    service: "ledger-validator",
    version: "1.0.0",
    endpoints: ["pbft.prepare", "pbft.commit", "ledger.alert"],
  });
  await setupPBFTListeners();
  await broadcastPBFT("pbft.prepare", { seq: 1, block: "B1" });
  logger.info("AuroraTrust Fabric initialized ✅");
})();
