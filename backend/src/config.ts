import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  // --- AWS region (single region for all services) ---
  AWS_REGION: z.string().default("ap-south-1"),

  // --- Amazon Bedrock (LLM + tool use) ---
  /** Bedrock model / inference-profile id (ap-south-1 uses the `apac.` cross-region profiles). */
  BEDROCK_MODEL_ID: z.string().default("apac.anthropic.claude-3-5-sonnet-20240620-v1:0"),

  // --- Amazon Transcribe (speech-to-text) ---
  /** BCP-47 language code for streaming transcription, e.g. `en-US`, `en-IN`. */
  TRANSCRIBE_LANGUAGE_CODE: z.string().default("en-US"),

  // --- Amazon Polly (text-to-speech) ---
  POLLY_VOICE_ID: z.string().default("Joanna"),
  POLLY_ENGINE: z.enum(["standard", "neural"]).default("neural"),

  // --- S3 (TTS audio objects, served via presigned URLs) ---
  AUDIO_BUCKET: z.string().default(""),
  /** Presigned-URL lifetime for synthesized audio, in seconds. */
  AUDIO_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  // --- Auth ---
  JWT_SECRET: z.string().min(16),
  FRONTEND_URL: z.string().url(),
  WIDGET_ALLOWED_ORIGINS: z.string().default("*"),

  // --- DynamoDB ---
  DYNAMODB_ENDPOINT: z.string().optional().default(""),
  DYNAMODB_USERS_TABLE: z.string().default("streammeo-users"),
  DYNAMODB_WORKSPACES_TABLE: z.string().default("streammeo-workspaces"),
  DYNAMODB_SESSIONS_TABLE: z.string().default("streammeo-sessions"),
  DYNAMODB_MESSAGES_TABLE: z.string().default("streammeo-messages"),
  DYNAMODB_TOOL_CALLS_TABLE: z.string().default("streammeo-tool-calls"),
  DYNAMODB_FAQS_TABLE: z.string().default("streammeo-faqs"),

  // --- AppSync (realtime transcript/state fan-out) ---
  APPSYNC_GRAPHQL_URL: z.string().optional().default(""),
  APPSYNC_API_KEY: z.string().optional().default(""),

  /**
   * Full Firebase service account JSON (single line or pretty). Enables POST /api/v1/auth/firebase-session.
   * Create in Firebase Console → Project settings → Service accounts → Generate new private key.
   */
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional().default(""),
});

type ParsedEnv = z.infer<typeof envSchema>;

export type AppConfig = Readonly<
  ParsedEnv & {
    firebaseServiceAccountJson: string;
  }
>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid env: ${JSON.stringify(formatted)}`);
  }
  const d = parsed.data;
  return Object.freeze({
    ...d,
    DYNAMODB_ENDPOINT: d.DYNAMODB_ENDPOINT.trim(),
    APPSYNC_GRAPHQL_URL: d.APPSYNC_GRAPHQL_URL.trim(),
    APPSYNC_API_KEY: d.APPSYNC_API_KEY.trim(),
    AUDIO_BUCKET: d.AUDIO_BUCKET.trim(),
    firebaseServiceAccountJson: d.FIREBASE_SERVICE_ACCOUNT_JSON.trim(),
  });
}

/** Widget (voice) CORS: `*` or the comma-separated `WIDGET_ALLOWED_ORIGINS` list. */
export function getCorsOrigins(config: AppConfig): boolean | string[] {
  const raw = config.WIDGET_ALLOWED_ORIGINS.trim();
  if (raw === "*") return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Control-plane (auth/workspace) CORS: locked to the dashboard origin (`FRONTEND_URL`). */
export function getDashboardCorsOrigins(config: AppConfig): string[] {
  return [config.FRONTEND_URL.replace(/\/+$/u, "")];
}
