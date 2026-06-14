import awsLambdaFastify from "@fastify/aws-lambda";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { buildApp } from "../app.js";
import { parseConfig } from "../config.js";

type LambdaProxy = (
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyResultV2>;

let proxy: LambdaProxy | undefined;

async function getProxy(): Promise<LambdaProxy> {
  if (!proxy) {
    const config = parseConfig();
    const app = await buildApp({ config, prettyLogs: false });
    await app.ready();
    proxy = awsLambdaFastify(app);
  }
  return proxy;
}

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResultV2> {
  const dispatch = await getProxy();
  return dispatch(event, context);
}
