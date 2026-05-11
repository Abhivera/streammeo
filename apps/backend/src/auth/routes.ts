import { randomUUID } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { AppConfig } from "../config";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { createAuthMiddleware, type JwtPayload } from "./middleware";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  workspaceName: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function issueToken(params: AppConfig & { payload: JwtPayload }): string {
  return jwt.sign(params.payload, params.JWT_SECRET, { expiresIn: "14d" });
}

function isSqliteUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const code = String((err as { code: unknown }).code);
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT_PRIMARYKEY";
}

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config);
  const log = createLogger(config, "auth");

  router.post("/demo-login", async (_req, res) => {
    if (!config.demoMode) {
      res.status(404).json({ error: "Demo login is not enabled on this server" });
      return;
    }
    const email = config.demoSeedEmail.toLowerCase().trim();
    try {
      const user = await getStore().users.findByEmail(email);
      const workspace = user && (await getStore().workspaces.listByOwner(user.id)).at(0);
      if (!(user && workspace)) {
        res.status(503).json({
          error: "Demo account not found. From the repo root run: npm run db:seed",
        });
        return;
      }
      const payload: JwtPayload = {
        userId: user.id,
        workspaceId: workspace.id,
        email: user.email,
      };
      log.info({ email }, "demo login issued");
      res.json({
        token: issueToken({ ...config, payload }),
        workspace,
      });
    } catch (err) {
      log.error({ err }, "demo login failed");
      res.status(500).json({ error: "Demo login failed" });
    }
  });

  router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();

    try {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const userId = randomUUID();
      const workspaceId = randomUUID();
      const apiKey =
        `${randomUUID().replace(/-/gu, "")}${randomUUID().replace(/-/gu, "").slice(0, 10)}`;

      try {
        await getStore().users.createIfAbsent({
          id: userId,
          email,
          password: passwordHash,
          createdAt: new Date().toISOString(),
        });
      } catch (err: unknown) {
        if (isSqliteUniqueViolation(err)) {
          res.status(409).json({ error: "Email already registered" });
          return;
        }
        throw err;
      }

      const iso = new Date().toISOString();

      try {
        await getStore().workspaces.put({
          id: workspaceId,
          name: parsed.data.workspaceName,
          apiKey,
          language: "en",
          agentName: "Alex",
          systemPrompt: "You are a helpful customer support agent.",
          plan: "free",
          minutesUsed: 0,
          minutesLimit: 0,
          ownerId: userId,
          shopifyShopDomain: null,
          shopifyAccessToken: null,
          createdAt: iso,
        });
      } catch (errWs) {
        await getStore().users.deleteByEmail(email).catch(() => undefined);
        throw errWs;
      }

      const workspace = await getStore().workspaces.findById(workspaceId);
      if (!workspace) {
        log.error("registration could not reload workspace");
        await getStore().users.deleteByEmail(email).catch(() => undefined);
        res.status(500).json({ error: "Could not complete registration" });
        return;
      }

      const payload: JwtPayload = { userId, workspaceId, email };
      res.status(201).json({ token: issueToken({ ...config, payload }), workspace });
    } catch (err) {
      log.error({ err }, "register failed");
      res.status(500).json({ error: "Registration failed" });
    }
  });

  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();

    try {
      const user = await getStore().users.findByEmail(email);
      const workspace =
        user && (await getStore().workspaces.listByOwner(user.id)).at(0);

      const matches =
        user &&
        workspace !== undefined &&
        (await bcrypt.compare(parsed.data.password, user.password));
      if (!(user && workspace && matches)) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const payload: JwtPayload = {
        userId: user.id,
        workspaceId: workspace.id,
        email: user.email,
      };
      res.json({
        token: issueToken({ ...config, payload }),
        workspace,
      });
    } catch (err) {
      log.error({ err }, "login failed");
      res.status(500).json({ error: "Login failed" });
    }
  });

  router.get("/me", authMiddleware, async (req, res) => {
    const authPayload = req.auth;
    if (!authPayload) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [userRow, ws] = await Promise.all([
      getStore().users.findById(authPayload.userId),
      getStore().workspaces.findById(authPayload.workspaceId),
    ]);

    if (!(userRow && ws && ws.ownerId === authPayload.userId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      user: {
        id: userRow.id,
        email: userRow.email,
        createdAt: userRow.createdAt,
      },
      workspace: ws,
    });
  });

  return router;
}
