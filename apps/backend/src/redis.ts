import { Redis } from "ioredis";
import type { AppConfig } from "./config";

let redis: Redis | undefined;

export function getRedis(config: AppConfig): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }
  return redis;
}

export function usageRedisKey(workspaceId: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `usage:${workspaceId}:${month}`;
}
