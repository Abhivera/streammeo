type DeepgramJsonError = {
  err_msg?: string;
  err_code?: string;
  message?: string;
};

/**
 * Map Deepgram HTTP failures to short messages for the widget / logs.
 */
export function deepgramUserFacingMessage(
  label: "Speech-to-text" | "Text-to-speech",
  status: number,
  body: string,
): string {
  let parsed: DeepgramJsonError | null = null;
  try {
    parsed = JSON.parse(body) as DeepgramJsonError;
  } catch {
    // body may be plain text
  }

  const msg =
    (typeof parsed?.err_msg === "string" ? parsed.err_msg : "") ||
    (typeof parsed?.message === "string" ? parsed.message : "");

  if (status === 401 || status === 403) {
    return `${label} failed: invalid or unauthorized API key. Check DEEPGRAM_API_KEY.`;
  }

  if (status === 402 || status === 429) {
    if (/balance|credit|quota|limit|payment/i.test(msg)) {
      return `${label} is unavailable: Deepgram reported a quota or billing issue. Check your Deepgram project, or set DEMO_MODE=true for local testing without Deepgram.`;
    }
    return `${label} hit a rate or quota limit (HTTP ${status}). Retry shortly or check your Deepgram plan.`;
  }

  const tail = (msg || body).replace(/\s+/g, " ").trim().slice(0, 400);
  return `${label} failed (${status}): ${tail || "(empty response)"}`;
}
