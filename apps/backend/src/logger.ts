import pino from "pino";
import type { AppConfig } from "./config";

export function createLogger(config: AppConfig, name?: string): pino.Logger {
  const base =
    config.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          } as const,
        }
      : {};

  return pino(
    {
      name,
      level: config.NODE_ENV === "development" ? "debug" : "info",
      ...base,
    },
    pino.destination(1),
  );
}
