import type { SarvamLocale } from "../lang-map";

const TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech";

export async function synthesise(
  text: string,
  apiKey: string,
  locale: SarvamLocale,
  abortSignal?: AbortSignal,
): Promise<Buffer> {
  const body = JSON.stringify({
    model: "bulbul:v1",
    target_language_code: locale,
    text,
    pace: 1,
    pitch: 0,
    loudness: 1,
    speech_sample_rate: 22050,
  });

  const res = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      Accept: "*/*",
      "Content-Type": "application/json",
    },
    body,
    signal: abortSignal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS failed (${res.status}): ${errText.slice(0, 500)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export function wavChunks(buf: Buffer, chunkSize = 16384): Buffer[] {
  const out: Buffer[] = [];
  for (let i = 0; i < buf.length; i += chunkSize) {
    out.push(buf.subarray(i, i + chunkSize));
  }
  return out.length ? out : [Buffer.alloc(0)];
}
