import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import { loadConfig } from "./config.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerTicketRoutes } from "./tickets/routes.js";
import { registerInboxRoutes } from "./inbox/routes.js";
import { registerSlaRoutes, checkSlaBreaches } from "./sla/routes.js";
import { registerEmailRoutes } from "./email/routes.js";
import { registerAnalyticsRoutes } from "./analytics/routes.js";
import { registerBillingRoutes } from "./billing/routes.js";
import { registerAiRoutes } from "./ai/routes.js";
import { registerKbRoutes } from "./kb/routes.js";
import { registerCsatRoutes } from "./csat/routes.js";
import { registerPortalRoutes } from "./portal/routes.js";
import { registerChatRoutes } from "./chat/routes.js";
import { createPresenceServer } from "./presence/socket.js";
import { prisma } from "./db.js";

const config = loadConfig();

const app = Fastify({
  logger: {
    transport:
      config.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

await app.register(cors, {
  origin: config.FRONTEND_URL,
  credentials: true,
});

await app.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
});

const redis = new Redis(config.REDIS_URL);

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

const port = config.PORT;
await app.listen({ port, host: "0.0.0.0" });

createPresenceServer(app.server, config, redis);

setInterval(() => {
  void checkSlaBreaches().then((count) => {
    if (count > 0) app.log.warn({ count }, "SLA breaches detected");
  });
}, 60_000);

app.log.info(`Streammeo API listening on http://localhost:${port}`);

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  redis.disconnect();
  await app.close();
});
