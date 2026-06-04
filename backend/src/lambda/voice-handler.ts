import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import serverless from "serverless-http";
import { loadConfig } from "../config";
import { initStore } from "../db";
import { buildPipelineDeps } from "../runtime/build-pipeline-deps";
import { createVoiceApp } from "../runtime/voice-app";

/** Voice Lambda: serves `/api/v1/voice/session` + `/api/v1/voice/turn`. */
const bootstrap = (async () => {
  const config = loadConfig();
  await initStore(config);
  const deps = buildPipelineDeps(config);
  return serverless(createVoiceApp(deps));
})();

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> {
  const app = await bootstrap;
  return app(event, context) as Promise<APIGatewayProxyResultV2>;
}
