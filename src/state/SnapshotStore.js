import fs from "fs";
export class SnapshotStore {
  constructor(file = "./data/chain.snapshot.json") { this.file = file; }
  saveSnapshot(chainMeta) {
    fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(chainMeta, null, 2));
  }
  loadSnapshot() {
    try { return JSON.parse(fs.readFileSync(this.file, "utf8")); }
    catch { return null; }
  }
}
