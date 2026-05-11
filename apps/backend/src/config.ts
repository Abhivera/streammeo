import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    REDIS_URL: z.string().min(1),
    /** When `true`, Deepgram/Groq keys optional; voice pipeline uses canned STT/TTS/LLM for local testing. */
    DEMO_MODE: z.string().optional().default(""),
    /** Email for POST /auth/demo-login — must match a seeded user (default: first test account). */
    DEMO_SEED_EMAIL: z.string().email().optional().default("moviesabhijit@gmail.com"),
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
    /** SQLite database file (created automatically). */
    SQLITE_PATH: z.string().min(1).default("./data/streammeo.db"),
  })
  .superRefine((data, ctx) => {
    const demo = data.DEMO_MODE === "true";
    if (demo) return;
    if (data.DEEPGRAM_API_KEY.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DEEPGRAM_API_KEY is required unless DEMO_MODE=true",
        path: ["DEEPGRAM_API_KEY"],
      });
    }
    if (data.GROQ_API_KEY.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GROQ_API_KEY is required unless DEMO_MODE=true",
        path: ["GROQ_API_KEY"],
      });
    }
  });

type ParsedEnv = z.infer<typeof envSchema>;

export type AppConfig = Readonly<
  ParsedEnv & {
    demoMode: boolean;
    demoSeedEmail: string;
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
    demoMode: d.DEMO_MODE === "true",
    demoSeedEmail: d.DEMO_SEED_EMAIL,
  });
}

export function getCorsOrigins(config: AppConfig): boolean | string[] {
  const raw = config.WIDGET_ALLOWED_ORIGINS.trim();
  if (raw === "*") return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
