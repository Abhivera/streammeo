import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  REDIS_URL: z.string().min(1),
  SARVAM_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  FRONTEND_URL: z.string().url(),
  WIDGET_ALLOWED_ORIGINS: z.string().default("*"),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  /** Tavily — when unset, `web_search` tool is omitted */
  TAVILY_API_KEY: z.string().optional().default(""),
  AWS_REGION: z.string().min(2).default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  /** e.g. `http://localhost:8000` for DynamoDB Local */
  DYNAMODB_ENDPOINT: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s : undefined)),
  /** Table prefix — tables are `{prefix}Users`, `{prefix}Workspaces`, … */
  DYNAMODB_TABLE_PREFIX: z.string().min(2).default("VoiceWidget"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid env: ${JSON.stringify(formatted)}`);
  }
  return Object.freeze(parsed.data);
}

export function getCorsOrigins(config: AppConfig): boolean | string[] {
  const raw = config.WIDGET_ALLOWED_ORIGINS.trim();
  if (raw === "*") return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function dynamoCredentialPair(
  config: AppConfig,
): { accessKeyId: string; secretAccessKey: string } | undefined {
  const a = config.AWS_ACCESS_KEY_ID.trim();
  const s = config.AWS_SECRET_ACCESS_KEY.trim();
  return a.length > 0 && s.length > 0 ? { accessKeyId: a, secretAccessKey: s } : undefined;
}
