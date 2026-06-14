import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { parseConfig, type AppConfig } from "./config.js";
import { buildFastifyCorsOptions } from "./cors.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerTicketRoutes } from "./tickets/routes.js";
import { registerInboxRoutes } from "./inbox/routes.js";
import { registerSlaRoutes } from "./sla/routes.js";
import { registerEmailRoutes } from "./email/routes.js";
import { registerAnalyticsRoutes } from "./analytics/routes.js";
import { registerBillingRoutes } from "./billing/routes.js";
import { registerAiRoutes } from "./ai/routes.js";
import { registerKbRoutes } from "./kb/routes.js";
import { registerCsatRoutes } from "./csat/routes.js";
import { registerPortalRoutes } from "./portal/routes.js";
import { registerChatRoutes } from "./chat/routes.js";
import { registerTeamRoutes } from "./team/routes.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

export type BuildAppOptions = {
  config?: AppConfig;
  prettyLogs?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? parseConfig();
  const prettyLogs = options.prettyLogs ?? config.NODE_ENV === "development";

  const app = Fastify({
    logger: prettyLogs
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    try {
      request.rawBody = body as string;
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(cors, buildFastifyCorsOptions(config));

  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ ok: true, service: "streammeo-api" }));

  await registerAuthRoutes(app, config);
  await registerTicketRoutes(app, config);
  await registerInboxRoutes(app, config);
  await registerSlaRoutes(app, config);
  await registerEmailRoutes(app, config);
  await registerAnalyticsRoutes(app, config);
  await registerBillingRoutes(app, config);
  await registerAiRoutes(app, config);
  await registerKbRoutes(app, config);
  await registerCsatRoutes(app, config);
  await registerPortalRoutes(app, config);
  await registerChatRoutes(app, config);
  await registerTeamRoutes(app, config);

  return app;
}
