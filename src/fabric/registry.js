// simple in-memory registry
const services = new Map();

export function registerService(info) {
  const key = `${info.org}:${info.service}`;
  services.set(key, info);
}

export function listServices() {
  return Array.from(services.values());
}
