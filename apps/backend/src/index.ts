/** HTTP API, auth routes, and Socket.IO voice pipeline. MongoDB via `initStore`. */
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import Groq from "groq-sdk";
import { loadConfig, getCorsOrigins } from "./config";
import { createLogger } from "./logger";
import { createAuthRouter } from "./auth/routes";
import { createWorkspaceRouter } from "./workspace/routes";
import { ToolRegistry } from "./tools/registry";
import { getOrderStatusTool } from "./tools/get-order-status";
import { searchFaqTool } from "./tools/search-faq";
import { createWebSearchTool } from "./tools/web-search";
import { attachSocketHandlers } from "./socket/handler";
import { initStore } from "./db";

async function main(): Promise<void> {
  const config = loadConfig();
  await initStore(config);
  const log = createLogger(config, "boot");
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(getOrderStatusTool);
  toolRegistry.register(searchFaqTool);
  const tavilyKey = config.TAVILY_API_KEY.trim();
  if (tavilyKey.length > 0) {
    toolRegistry.register(createWebSearchTool(tavilyKey));
    log.info("Tavily web_search tool enabled");
  } else {
    log.warn("TAVILY_API_KEY not set — web_search tool disabled");
  }

  const groq = new Groq({
    apiKey: config.GROQ_API_KEY,
  });

  const pipelineDeps = Object.freeze({
    config,
    tools: toolRegistry,
    groq,
  });

  const app = express();

  app.use(
    cors({
      origin: getCorsOrigins(config),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      firebaseAuth: config.firebaseServiceAccountJson.length > 0,
    });
  });

  app.use("/auth", authLimiter, createAuthRouter(config));
  app.use("/workspace", createWorkspaceRouter(config));

  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: getCorsOrigins(config),
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 10e6,
  });

  attachSocketHandlers(io, pipelineDeps);

  const port = config.PORT;
  server.listen(port, () => {
    log.info(`HTTP + Socket.IO listening on http://localhost:${port}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
