/** Local dev server: serves the control-plane + voice HTTP apps on one port.
 * In production these run as separate Lambdas behind API Gateway. */
import express from "express";
import { loadConfig } from "./config";
import { initStore } from "./db";
import { createLogger } from "./logger";
import { buildPipelineDeps } from "./runtime/build-pipeline-deps";
import { createHttpApp } from "./runtime/http-app";
import { createVoiceApp } from "./runtime/voice-app";

async function main(): Promise<void> {
  const config = loadConfig();
  await initStore(config);
  const log = createLogger(config, "boot");
  const deps = buildPipelineDeps(config);

  const app = express();
  app.use(createHttpApp(config));
  app.use(createVoiceApp(deps));

  app.listen(config.PORT, () => {
    log.info(`HTTP API listening on http://localhost:${config.PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
