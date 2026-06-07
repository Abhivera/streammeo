import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import { handleInboundEmailWebhook } from "../webhooks/email-inbound.js";
import { handleEmailStatusWebhook } from "../webhooks/email-status.js";

export async function registerEmailRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.post("/api/v1/webhooks/email/inbound", async (request, reply) => {
    const result = await handleInboundEmailWebhook(
      config,
      request.body,
      request.headers as Record<string, string | undefined>,
    );
    return reply.code(result.status).send(result.body);
  });

  app.post("/api/v1/webhooks/email/status", async (request, reply) => {
    const result = await handleEmailStatusWebhook(config, request.body);
    app.log.info({ event: "email.status", payload: request.body }, "Email delivery status");
    return reply.code(result.status).send(result.body);
  });
}

export async function sendOutboundEmail(
  config: AppConfig,
  input: { to: string; subject: string; body: string; from: string },
): Promise<{ sent: boolean; provider?: string }> {
  if (!config.BREVO_API_KEY) {
    return { sent: false, provider: "stub" };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: input.from, name: "Streammeo Support" },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status}`);
  }

  return { sent: true, provider: "brevo" };
}
