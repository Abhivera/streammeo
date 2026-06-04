import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { PollyClient } from "@aws-sdk/client-polly";
import { S3Client } from "@aws-sdk/client-s3";
import { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import type { AppConfig } from "../config";
import { createLogger } from "../logger";
import type { PipelineDeps } from "../pipeline/deps";
import { getOrderStatusTool } from "../tools/get-order-status";
import { ToolRegistry } from "../tools/registry";
import { searchFaqTool } from "../tools/search-faq";

export function buildPipelineDeps(config: AppConfig): PipelineDeps {
  const log = createLogger(config, "boot");
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(getOrderStatusTool);
  toolRegistry.register(searchFaqTool);
  log.info("Tool registry loaded with get_order_status and search_faq");

  const region = config.AWS_REGION;

  return Object.freeze({
    config,
    tools: toolRegistry,
    bedrock: new BedrockRuntimeClient({ region }),
    transcribe: new TranscribeStreamingClient({ region }),
    polly: new PollyClient({ region }),
    s3: new S3Client({ region }),
  });
}
