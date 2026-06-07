import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { parseConfig } from "../config.js";
import { handleBillingWebhook } from "../webhooks/billing.js";
import { handleInboundEmailWebhook } from "../webhooks/email-inbound.js";
import { handleEmailStatusWebhook } from "../webhooks/email-status.js";

function jsonResponse(status: number, body: Record<string, unknown>): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function normalizeHeaders(
  headers: APIGatewayProxyEventV2["headers"],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  let config;
  try {
    config = parseConfig();
  } catch (err) {
    console.error("[webhook-handler] invalid config", err);
    return jsonResponse(500, { error: "Server misconfigured" });
  }
  const path = event.rawPath;
  const headers = normalizeHeaders(event.headers);
  const rawBody = event.body ?? "";
  const parsedBody = rawBody ? (JSON.parse(rawBody) as unknown) : {};

  try {
    switch (path) {
      case "/api/v1/webhooks/email/inbound": {
        const result = await handleInboundEmailWebhook(config, parsedBody, headers);
        return jsonResponse(result.status, result.body);
      }
      case "/api/v1/webhooks/email/status": {
        const result = await handleEmailStatusWebhook(config, parsedBody);
        return jsonResponse(result.status, result.body);
      }
      case "/api/v1/billing/webhook": {
        const signature = headers["x-razorpay-signature"];
        const result = await handleBillingWebhook(config, rawBody, parsedBody, signature);
        return jsonResponse(result.status, result.body);
      }
      default:
        return jsonResponse(404, { error: "Not found" });
    }
  } catch (err) {
    console.error("[webhook-handler] unhandled error", err);
    return jsonResponse(500, { error: "Internal server error" });
  }
}
