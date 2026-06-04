import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createAuthRouter } from "../auth/routes";
import type { AppConfig } from "../config";
import { getDashboardCorsOrigins } from "../config";
import { createWorkspaceRouter } from "../workspace/routes";

export function createHttpApp(config: AppConfig): express.Express {
  const app = express();

  app.use(
    cors({
      origin: getDashboardCorsOrigins(config),
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

  const healthJson = (): Record<string, unknown> => ({
    ok: true,
    firebaseAuth: config.firebaseServiceAccountJson.length > 0,
  });

  app.get("/health", (_req, res) => {
    res.json(healthJson());
  });

  const apiV1 = express.Router();
  apiV1.get("/health", (_req, res) => {
    res.json(healthJson());
  });
  apiV1.use("/auth", authLimiter, createAuthRouter(config));
  apiV1.use("/workspace", createWorkspaceRouter(config));
  app.use("/api/v1", apiV1);

  return app;
}
