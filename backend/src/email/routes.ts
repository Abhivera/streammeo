import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import { handleInboundEmailWebhook } from "../webhooks/email-inbound.js";
import { handleEmailStatusWebhook } from "../webhooks/email-status.js";

export { sendOutboundEmail } from "./service.js";

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
