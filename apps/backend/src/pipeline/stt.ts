import type { SarvamLocale } from "../lang-map";

const STT_ENDPOINT = "https://api.sarvam.ai/speech-to-text";

export async function transcribe(
  audioBuffer: Buffer,
  apiKey: string,
  locale: SarvamLocale,
): Promise<string> {
  const boundary = `----boundary-${Math.random().toString(36).slice(2)}`;
  const parts: Buffer[] = [];

  function append(field: string, value: string): void {
    parts.push(Buffer.from(`--${boundary}\r\n`, "utf8"));
    parts.push(
      Buffer.from(
        `Content-Disposition: form-data; name="${field}"\r\n\r\n${value}\r\n`,
        "utf8",
      ),
    );
  }

  append("model", "saarika:v2");
  append("language_code", locale);

  parts.push(Buffer.from(`--${boundary}\r\n`, "utf8"));
  parts.push(
    Buffer.from(
      `Content-Disposition: form-data; name="file"; filename="audio.webm"\r\n`,
      "utf8",
    ),
  );
  parts.push(Buffer.from(`Content-Type: audio/webm\r\n\r\n`, "utf8"));
  parts.push(audioBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));

  const body = Buffer.concat(parts);

  const res = await fetch(STT_ENDPOINT, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`STT failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const transcript =
    typeof data.transcript === "string"
      ? data.transcript
      : typeof data.text === "string"
        ? data.text
        : typeof data.result === "string"
          ? data.result
          : typeof data.output === "string"
            ? data.output
            : "";

  if (!transcript.trim()) {
    throw new Error(`STT response missing transcript: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return transcript.trim();
}
