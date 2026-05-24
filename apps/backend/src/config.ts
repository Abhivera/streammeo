import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DEEPGRAM_API_KEY: z.string().optional().default(""),
    /** Pre-recorded STT model (e.g. `nova-2`, `nova-3`). */
    DEEPGRAM_STT_MODEL: z.string().optional().default("nova-2"),
    /** Aura TTS model id (e.g. `aura-2-thalia-en`). English voice output. */
    DEEPGRAM_TTS_MODEL: z.string().optional().default("aura-2-thalia-en"),
    GROQ_API_KEY: z.string().optional().default(""),
    JWT_SECRET: z.string().min(16),
    FRONTEND_URL: z.string().url(),
    WIDGET_ALLOWED_ORIGINS: z.string().default("*"),
    /** Tavily — when unset, `web_search` tool is omitted */
    TAVILY_API_KEY: z.string().optional().default(""),
    /** MongoDB connection string (database name from path, or use MONGODB_DB_NAME). */
    MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/streammeo"),
    /** Optional explicit DB name (otherwise parsed from MONGODB_URI or `streammeo`). */
    MONGODB_DB_NAME: z.string().min(1).optional(),
    /**
     * Full Firebase service account JSON (single line or pretty). Enables POST /api/v1/auth/firebase-session.
     * Create in Firebase Console → Project settings → Service accounts → Generate new private key.
     */
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.DEEPGRAM_API_KEY.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DEEPGRAM_API_KEY is required",
        path: ["DEEPGRAM_API_KEY"],
      });
    }
    if (data.GROQ_API_KEY.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GROQ_API_KEY is required",
        path: ["GROQ_API_KEY"],
      });
    }
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
    DEEPGRAM_STT_MODEL: d.DEEPGRAM_STT_MODEL.trim() || "nova-2",
    DEEPGRAM_TTS_MODEL: d.DEEPGRAM_TTS_MODEL.trim() || "aura-2-thalia-en",
    firebaseServiceAccountJson: d.FIREBASE_SERVICE_ACCOUNT_JSON.trim(),
  });
}

export function getCorsOrigins(config: AppConfig): boolean | string[] {
  const raw = config.WIDGET_ALLOWED_ORIGINS.trim();
  if (raw === "*") return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
