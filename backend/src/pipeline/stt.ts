import {
  StartStreamTranscriptionCommand,
  type TranscribeStreamingClient,
} from "@aws-sdk/client-transcribe-streaming";

/** Sample rate the widget records at and streams to Transcribe. */
export const PCM_SAMPLE_RATE_HZ = 16_000;

const CHUNK_BYTES = 16 * 1024;

/**
 * Transcribe a complete utterance of 16-bit little-endian mono PCM via Amazon
 * Transcribe streaming. The finite buffer is chunked into a short-lived stream.
 */
export async function transcribePcm(
  client: TranscribeStreamingClient,
  pcm: Buffer,
  languageCode: string,
): Promise<string> {
  async function* audioStream(): AsyncGenerator<{ AudioEvent: { AudioChunk: Uint8Array } }> {
    for (let offset = 0; offset < pcm.length; offset += CHUNK_BYTES) {
      yield { AudioEvent: { AudioChunk: new Uint8Array(pcm.subarray(offset, offset + CHUNK_BYTES)) } };
    }
  }

  const response = await client.send(
    new StartStreamTranscriptionCommand({
      LanguageCode: languageCode as never,
      MediaEncoding: "pcm",
      MediaSampleRateHertz: PCM_SAMPLE_RATE_HZ,
      AudioStream: audioStream(),
    }),
  );

  const segments: string[] = [];
  for await (const event of response.TranscriptResultStream ?? []) {
    const results = event.TranscriptEvent?.Transcript?.Results ?? [];
    for (const result of results) {
      if (result.IsPartial) continue;
      const text = result.Alternatives?.[0]?.Transcript?.trim();
      if (text) segments.push(text);
    }
  }

  return segments.join(" ").trim();
}
