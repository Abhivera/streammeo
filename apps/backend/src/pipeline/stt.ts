import { deepgramUserFacingMessage } from "./deepgram-errors";

const LISTEN_BASE = "https://api.deepgram.com/v1/listen";

export async function transcribe(
  audioBuffer: Buffer,
  apiKey: string,
  language: string,
  model: string,
): Promise<string> {
  const params = new URLSearchParams({
    model,
    language,
    smart_format: "true",
  });
  const url = `${LISTEN_BASE}?${params.toString()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "audio/webm",
    },
    body: audioBuffer,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(deepgramUserFacingMessage("Speech-to-text", res.status, text));
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Speech-to-text: invalid JSON response (${text.slice(0, 200)})`);
  }

  const transcript = extractTranscript(data);
  return transcript.trim();
}

function extractTranscript(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;
  const results = root.results;
  if (!results || typeof results !== "object") return "";
  const channels = (results as Record<string, unknown>).channels;
  if (!Array.isArray(channels) || channels.length === 0) return "";
  const ch0 = channels[0];
  if (!ch0 || typeof ch0 !== "object") return "";
  const alts = (ch0 as Record<string, unknown>).alternatives;
  if (!Array.isArray(alts) || alts.length === 0) return "";
  const a0 = alts[0];
  if (!a0 || typeof a0 !== "object") return "";
  const t = (a0 as Record<string, unknown>).transcript;
  return typeof t === "string" ? t : "";
}
