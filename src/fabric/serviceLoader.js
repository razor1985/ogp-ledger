// Dynamic ESM loader shim for @razor1985/ogp-services-node
import path from "path";
import { pathToFileURL } from "url";

export async function loadFabricBroker() {
  const ogpNodePkg = path.resolve(
    "./node_modules/@razor1985/ogp-services-node/dist/index.js"
  );
  const url = pathToFileURL(ogpNodePkg).href;
  const mod = await import(url);
  return mod.FabricBroker;
}
