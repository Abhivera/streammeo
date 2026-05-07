function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}`,
    );
  }
  return value;
}

export interface SarvamSttConfig {
  model: string;
  mode: string;
  languageCode: string;
  sampleRate: string;
  inputAudioCodec: string;
}

export interface SarvamTtsConfig {
  model: string;
  targetLanguageCode: string;
  speaker: string;
  pace: number;
  outputAudioCodec: string;
  minBufferSize: number;
  outputAudioBitrate: string;
}

export interface SarvamLlmConfig {
  model: string;
  maxTokens: number;
  reasoningEffort: string;
}

export interface GroqLlmConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface SarvamConfig {
  apiKey: string;
  stt: SarvamSttConfig;
  tts: SarvamTtsConfig;
  llm: SarvamLlmConfig;
}

export interface AppConfig {
  port: number;
  corsOrigin: string;
  llmProvider: "sarvam" | "groq";
  sarvam: SarvamConfig;
  groq: GroqLlmConfig;
  tavilyApiKey: string;
  maxAudioChunkDuration: number;
}

export function loadConfig(): AppConfig {
  const llmProvider = (process.env.LLM_PROVIDER ??
    "sarvam") as "sarvam" | "groq";

  return Object.freeze({
    port: parseInt(process.env.PORT ?? "8880", 10),
    corsOrigin:
      process.env.CORS_ORIGIN ?? "http://localhost:5173",
    llmProvider,
    sarvam: {
      apiKey: requireEnv("SARVAM_API_KEY"),
      stt: {
        model: "saaras:v3",
        mode: "transcribe",
        languageCode: "hi-IN",
        sampleRate: "16000",
        inputAudioCodec: "pcm_raw",
      },
      tts: {
        model: "bulbul:v3",
        targetLanguageCode: "hi-IN",
        speaker: "shubh",
        pace: 1,
        outputAudioCodec: "linear16",
        minBufferSize: 50,
        outputAudioBitrate: "192k",
      },
      llm: {
        model: "sarvam-105b",
        maxTokens: 700,
        reasoningEffort: "low",
      },
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY ?? "",
      model:
        process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      maxTokens: 700,
    },
    tavilyApiKey: requireEnv("TAVILY_API_KEY"),
    maxAudioChunkDuration: 20,
  });
}
