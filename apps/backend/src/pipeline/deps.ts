import type Groq from "groq-sdk";
import type { Redis } from "ioredis";
import type { AppConfig } from "../config";
import type { ToolRegistry } from "../tools/registry";

export type PipelineDeps = Readonly<{
  config: AppConfig;
  tools: ToolRegistry;
  redis: Redis;
  groq: Groq;
}>;
