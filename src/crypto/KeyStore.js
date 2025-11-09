import crypto from "crypto";
import fs from "fs";
import path from "path";

export class KeyStore {
  constructor({
    dir = "./keys",
    activeAlias = "active",
    hsm = null, // plug HSM/KMS client here
  } = {}) {
    this.dir = dir;
    this.activeAlias = activeAlias;
    this.hsm = hsm;
    fs.mkdirSync(dir, { recursive: true });
  }

  getActiveKeyPair() {
    if (this.hsm) return this.hsm.getActiveKeyPair();

    const priv = fs.readFileSync(path.join(this.dir, `${this.activeAlias}.priv.pem`), "utf8");
    const pub  = fs.readFileSync(path.join(this.dir, `${this.activeAlias}.pub.pem`), "utf8");
    return { privateKey: priv, publicKey: pub, alias: this.activeAlias };
  }

  rotateEd25519(alias = `key-${Date.now()}`) {
    if (this.hsm) return this.hsm.rotate(alias);

    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding:{ type: "pkcs8", format: "pem" },
    });
    fs.writeFileSync(path.join(this.dir, `${alias}.priv.pem`), privateKey);
    fs.writeFileSync(path.join(this.dir, `${alias}.pub.pem`),  publicKey);
    fs.writeFileSync(path.join(this.dir, `${this.activeAlias}.priv.pem`), privateKey);
    fs.writeFileSync(path.join(this.dir, `${this.activeAlias}.pub.pem`),  publicKey);
    return { alias, publicKey, privateKey };
  }
}
