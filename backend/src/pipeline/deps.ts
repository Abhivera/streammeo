import type { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import type { PollyClient } from "@aws-sdk/client-polly";
import type { S3Client } from "@aws-sdk/client-s3";
import type { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import type { AppConfig } from "../config";
import type { ToolRegistry } from "../tools/registry";

export type PipelineDeps = Readonly<{
  config: AppConfig;
  tools: ToolRegistry;
  bedrock: BedrockRuntimeClient;
  transcribe: TranscribeStreamingClient;
  polly: PollyClient;
  s3: S3Client;
}>;
