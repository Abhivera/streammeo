import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import serverless from "serverless-http";
import { loadConfig } from "../config";
import { initStore } from "../db";
import { createHttpApp } from "../runtime/http-app";

/** Control-plane Lambda: serves `/health` + `/api/v1/auth` + `/api/v1/workspace`. */
const bootstrap = (async () => {
  const config = loadConfig();
  await initStore(config);
  return serverless(createHttpApp(config));
})();

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> {
  const app = await bootstrap;
  return app(event, context) as Promise<APIGatewayProxyResultV2>;
}
