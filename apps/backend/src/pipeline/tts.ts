import { deepgramUserFacingMessage } from "./deepgram-errors";

const SPEAK_BASE = "https://api.deepgram.com/v1/speak";

export async function synthesise(
  text: string,
  apiKey: string,
  model: string,
  abortSignal?: AbortSignal,
): Promise<Buffer> {
  const url = `${SPEAK_BASE}?model=${encodeURIComponent(model)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/*",
    },
    body: JSON.stringify({ text }),
    signal: abortSignal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(deepgramUserFacingMessage("Text-to-speech", res.status, errText));
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
