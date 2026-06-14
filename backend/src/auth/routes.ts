import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  createUser,
  findValidPasswordResetToken,
  getMembership,
  getPrimaryMembership,
  getUserByEmail,
  getUserByFirebaseUidOrEmail,
  getUserById,
  createPasswordResetToken,
  markPasswordResetUsed,
  updateUser,
} from "@streammeo/db";
import type { AppConfig } from "../config.js";
import { sendOutboundEmail } from "../email/routes.js";
import { hashOpaqueToken, sessionWorkspace } from "./session.js";
import { createAuthHook, signToken } from "./middleware.js";
import { isFirebaseConfigured, verifyFirebaseIdToken } from "./firebase-admin.js";
import { createWorkspaceForUser } from "./workspace.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  workspaceName: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const firebaseAuthSchema = z.object({
  idToken: z.string().min(1),
  workspaceName: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(120).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function registerAuthRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);

  app.post("/api/v1/auth/register", async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", details: body.error.flatten() });
    }

    const existing = await getUserByEmail(body.data.email);
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10);
    const user = await createUser({
      email: body.data.email,
      password: passwordHash,
      name: body.data.name,
    });
    const workspace = await createWorkspaceForUser({
      userId: user.id,
      workspaceName: body.data.workspaceName,
    });

    const token = signToken(
      {
        userId: user.id,
        workspaceId: workspace.id,
        email: user.email,
        role: "admin",
      },
      config.JWT_SECRET,
    );

    return reply.code(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: "admin" as const },
      workspace: sessionWorkspace(workspace),
    });
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const user = await getUserByEmail(body.data.email);
    if (!user?.password || !(await bcrypt.compare(body.data.password, user.password))) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const primary = await getPrimaryMembership(user.id);
    if (!primary) {
      return reply.code(403).send({ error: "No workspace membership" });
    }

    const token = signToken(
      {
        userId: user.id,
        workspaceId: primary.workspace.id,
        email: user.email,
        role: primary.member.role,
      },
      config.JWT_SECRET,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: primary.member.role,
      },
      workspace: sessionWorkspace(primary.workspace),
    };
  });

  app.post("/api/v1/auth/firebase", async (request, reply) => {
    if (!isFirebaseConfigured(config)) {
      return reply.code(503).send({ error: "Google sign-in is not configured" });
    }

    const body = firebaseAuthSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(config, body.data.idToken);
    } catch {
      return reply.code(401).send({ error: "Invalid Google sign-in token" });
    }

    const email = decoded.email;
    if (!email) {
      return reply.code(400).send({ error: "Google account has no email address" });
    }

    const firebaseUid = decoded.uid;
    const displayName = body.data.name ?? decoded.name ?? email.split("@")[0];

    let user = await getUserByFirebaseUidOrEmail(firebaseUid, email);

    if (!user) {
      if (!body.data.workspaceName) {
        return reply.code(404).send({
          error: "No account found",
          code: "NO_ACCOUNT",
          message: "Create a workspace first, then sign in with Google.",
        });
      }

      const newUser = await createUser({ email, firebaseUid, name: displayName });
      const workspace = await createWorkspaceForUser({
        userId: newUser.id,
        workspaceName: body.data.workspaceName,
      });

      const token = signToken(
        {
          userId: newUser.id,
          workspaceId: workspace.id,
          email: newUser.email,
          role: "admin",
        },
        config.JWT_SECRET,
      );

      return reply.code(201).send({
        token,
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role: "admin" as const },
        workspace: sessionWorkspace(workspace),
      });
    }

    if (!user.firebaseUid) {
      user = (await updateUser(user.id, { firebaseUid })) ?? user;
    }

    const primary = await getPrimaryMembership(user.id);
    if (!primary) {
      return reply.code(403).send({ error: "No workspace membership" });
    }

    const token = signToken(
      {
        userId: user.id,
        workspaceId: primary.workspace.id,
        email: user.email,
        role: primary.member.role,
      },
      config.JWT_SECRET,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: primary.member.role,
      },
      workspace: sessionWorkspace(primary.workspace),
    };
  });

  app.post("/api/v1/auth/forgot-password", async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const user = await getUserByEmail(body.data.email);

    if (user?.password) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashOpaqueToken(rawToken);

      await createPasswordResetToken(user.id, tokenHash);

      const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${rawToken}`;

      try {
        const result = await sendOutboundEmail(config, {
          to: user.email,
          from: "noreply@streammeo.local",
          subject: "Reset your Streammeo password",
          body: [
            "You requested a password reset for your Streammeo account.",
            "",
            `Reset your password: ${resetUrl}`,
            "",
            "This link expires in 1 hour. If you did not request this, you can ignore this email.",
          ].join("\n"),
        });

        if (!result.sent) {
          request.log.info({ resetUrl, email: user.email }, "Password reset link (email not configured)");
        }
      } catch (err) {
        request.log.error({ err }, "Failed to send password reset email");
      }
    }

    return { ok: true, message: "If that email is registered, a reset link has been sent." };
  });

  app.post("/api/v1/auth/reset-password", async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const tokenHash = hashOpaqueToken(body.data.token);
    const resetToken = await findValidPasswordResetToken(tokenHash);

    if (!resetToken) {
      return reply.code(400).send({ error: "Invalid or expired reset link" });
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10);
    await updateUser(resetToken.userId, { password: passwordHash });
    await markPasswordResetUsed(resetToken.userId, resetToken.id);

    return { ok: true, message: "Password updated. You can sign in now." };
  });

  app.get("/api/v1/auth/me", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const user = await getUserById(authPayload.userId);
    if (!user) return reply.code(404).send({ error: "User not found" });

    const membership = await getMembership(authPayload.userId, authPayload.workspaceId);
    if (!membership) return reply.code(404).send({ error: "Workspace not found" });

    const { getWorkspaceById } = await import("@streammeo/db");
    const workspace = await getWorkspaceById(authPayload.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: membership.role },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        apiKey: workspace.apiKey,
        ticketsUsed: workspace.ticketsUsed,
        ticketsLimit: workspace.ticketsLimit,
      },
    };
  });
}
