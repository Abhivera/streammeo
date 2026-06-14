import { z } from "zod";

function optionalString() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().optional(),
  );
}

function optionalUrl() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().url().optional(),
  );
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  /** Comma-separated embed origins, or * for any (chat widget on customer sites). */
  WIDGET_ALLOWED_ORIGINS: optionalString(),
  JWT_SECRET: z.string().min(16),
  DYNAMODB_TABLE_NAME: z.string().default("streammeo"),
  DYNAMODB_ENDPOINT: optionalString(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BREVO_API_KEY: optionalString(),
  BREVO_WEBHOOK_SECRET: optionalString(),
  RAZORPAY_KEY_ID: optionalString(),
  RAZORPAY_KEY_SECRET: optionalString(),
  RAZORPAY_WEBHOOK_SECRET: optionalString(),
  ANTHROPIC_API_KEY: optionalString(),
  APPSYNC_GRAPHQL_URL: optionalUrl(),
  APPSYNC_API_KEY: optionalString(),
  FIREBASE_SERVICE_ACCOUNT_JSON: optionalString(),
  UPLOADS_BUCKET: optionalString(),
  UPLOADS_CDN_URL: optionalUrl(),
  EMAIL_QUEUE_URL: optionalUrl(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }
  return parsed.data;
}

export function loadConfig(): AppConfig {
  try {
    return parseConfig();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
