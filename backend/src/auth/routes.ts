import { randomBytes, randomUUID } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { AppConfig } from "../config";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { isFirebaseAuthConfigured, verifyFirebaseIdToken } from "./firebase-admin";
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

const firebaseSessionSchema = z.object({
  idToken: z.string().min(1),
  /** Required when the Firebase user has no Streammeo row yet (same as email registration). */
  workspaceName: z.string().min(1).max(120).optional(),
});

function issueToken(params: AppConfig & { payload: JwtPayload }): string {
  return jwt.sign(params.payload, params.JWT_SECRET, { expiresIn: "14d" });
}

/** Duplicate-key detection for DynamoDB conditional write conflicts. */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: unknown }).name === "ConditionalCheckFailedException"
  );
}

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config);
  const log = createLogger(config, "auth");

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
        if (isDuplicateKeyError(err)) {
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

  router.post("/firebase-session", async (req, res) => {
    if (!isFirebaseAuthConfigured(config)) {
      res.status(501).json({ error: "Firebase authentication is not enabled on this server" });
      return;
    }
    const parsed = firebaseSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    let emailFromToken: string;
    let firebaseUid: string;
    try {
      const decoded = await verifyFirebaseIdToken(config, parsed.data.idToken);
      const em = decoded.email?.toLowerCase().trim();
      if (!em) {
        res.status(400).json({
          error:
            "Your Firebase account has no email. Use Google or another provider that supplies an email address.",
        });
        return;
      }
      emailFromToken = em;
      firebaseUid = decoded.uid;
    } catch (err) {
      log.warn({ err }, "firebase id token verify failed");
      res.status(401).json({ error: "Invalid or expired Firebase token" });
      return;
    }

    try {
      let user =
        (await getStore().users.findByFirebaseUid(firebaseUid)) ??
        (await getStore().users.findByEmail(emailFromToken));

      if (user) {
        if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
          res.status(409).json({ error: "This email is already linked to a different Firebase account." });
          return;
        }
        if (!user.firebaseUid) {
          await getStore().users.setFirebaseUid(user.id, firebaseUid);
          user = { ...user, firebaseUid };
        }
      } else {
        const workspaceName = parsed.data.workspaceName?.trim();
        if (!workspaceName) {
          res.status(400).json({
            error:
              "No dashboard account for this Google user yet. Register first (with workspace name) or use email/password if you already have an account.",
          });
          return;
        }

        const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
        const userId = randomUUID();
        const workspaceId = randomUUID();
        const apiKey =
          `${randomUUID().replace(/-/gu, "")}${randomUUID().replace(/-/gu, "").slice(0, 10)}`;
        const iso = new Date().toISOString();

        try {
          await getStore().users.createIfAbsent({
            id: userId,
            email: emailFromToken,
            password: passwordHash,
            createdAt: iso,
            firebaseUid,
          });
        } catch (err: unknown) {
          if (isDuplicateKeyError(err)) {
            res.status(409).json({ error: "Email already registered" });
            return;
          }
          throw err;
        }

        try {
          await getStore().workspaces.put({
            id: workspaceId,
            name: workspaceName,
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
          await getStore().users.deleteByEmail(emailFromToken).catch(() => undefined);
          throw errWs;
        }

        const workspace = await getStore().workspaces.findById(workspaceId);
        if (!workspace) {
          await getStore().users.deleteByEmail(emailFromToken).catch(() => undefined);
          res.status(500).json({ error: "Could not complete registration" });
          return;
        }

        const payload: JwtPayload = { userId, workspaceId, email: emailFromToken };
        log.info({ email: emailFromToken }, "firebase registration");
        res.status(201).json({ token: issueToken({ ...config, payload }), workspace });
        return;
      }

      const workspace = (await getStore().workspaces.listByOwner(user.id)).at(0);
      if (!workspace) {
        res.status(500).json({ error: "Account has no workspace" });
        return;
      }

      const payload: JwtPayload = {
        userId: user.id,
        workspaceId: workspace.id,
        email: user.email,
      };
      log.info({ email: user.email }, "firebase session");
      res.json({ token: issueToken({ ...config, payload }), workspace });
    } catch (err) {
      log.error({ err }, "firebase-session failed");
      res.status(500).json({ error: "Firebase sign-in failed" });
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
