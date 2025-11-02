import chalk from "chalk";

const stamp = () => new Date().toISOString();

export default {
  info: (...a) => console.log(chalk.cyan(`[${stamp()}][INFO]`), ...a),
  warn: (...a) => console.warn(chalk.yellow(`[${stamp()}][WARN]`), ...a),
  error: (...a) => console.error(chalk.red(`[${stamp()}][ERROR]`), ...a),
};
