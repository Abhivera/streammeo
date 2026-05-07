import pino from "pino";

const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export type Logger = pino.Logger;

export function createLogger(tag: string): Logger {
  return rootLogger.child({ module: tag });
}
