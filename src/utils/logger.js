import util from "util";

const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
};

function timestamp() {
  return new Date().toISOString();
}

function format(msg, ...args) {
  return util.format(msg, ...args);
}

const logger = {
  debug: (msg, ...args) =>
    console.log(`${COLORS.gray}[${timestamp()}][DEBUG]${COLORS.reset} ${format(msg, ...args)}`),
  info: (msg, ...args) =>
    console.log(`${COLORS.cyan}[${timestamp()}][INFO]${COLORS.reset} ${format(msg, ...args)}`),
  warn: (msg, ...args) =>
    console.warn(`${COLORS.yellow}[${timestamp()}][WARN]${COLORS.reset} ${format(msg, ...args)}`),
  error: (msg, ...args) =>
    console.error(`${COLORS.red}[${timestamp()}][ERROR]${COLORS.reset} ${format(msg, ...args)}`),
};

export default logger;
