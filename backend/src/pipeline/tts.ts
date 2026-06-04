import { randomUUID } from "node:crypto";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppConfig } from "../config";

/**
 * Synthesize speech with Amazon Polly, store the MP3 in S3, and return a
 * presigned GET URL the widget can fetch and play.
 */
export async function synthesiseToUrl(
  deps: Readonly<{ polly: PollyClient; s3: S3Client; config: AppConfig }>,
  text: string,
): Promise<string> {
  const speech = await deps.polly.send(
    new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: deps.config.POLLY_VOICE_ID as never,
      Engine: deps.config.POLLY_ENGINE,
    }),
  );

  if (!speech.AudioStream) {
    throw new Error("Text-to-speech: Polly returned no audio");
  }
  const bytes = await speech.AudioStream.transformToByteArray();

  const key = `tts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.mp3`;
  await deps.s3.send(
    new PutObjectCommand({
      Bucket: deps.config.AUDIO_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: "audio/mpeg",
    }),
  );

  return getSignedUrl(
    deps.s3,
    new GetObjectCommand({ Bucket: deps.config.AUDIO_BUCKET, Key: key }),
    { expiresIn: deps.config.AUDIO_URL_TTL_SECONDS },
  );
}
