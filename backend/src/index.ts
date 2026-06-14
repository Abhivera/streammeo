import { Redis } from "ioredis";
import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";
import { checkSlaBreaches } from "./sla/routes.js";
import { createPresenceServer } from "./presence/socket.js";
import { dbDisconnect } from "./db.js";

const config = loadConfig();
const app = await buildApp({ config, prettyLogs: config.NODE_ENV === "development" });

const port = config.PORT;
await app.listen({ port, host: "0.0.0.0" });

const redis = new Redis(config.REDIS_URL);
createPresenceServer(app.server, config, redis);

setInterval(() => {
  void checkSlaBreaches().then((count) => {
    if (count > 0) app.log.warn({ count }, "SLA breaches detected");
  });
}, 60_000);

app.log.info(`Streammeo API listening on http://localhost:${port}`);

process.on("SIGTERM", async () => {
  await dbDisconnect();
  redis.disconnect();
  await app.close();
});
