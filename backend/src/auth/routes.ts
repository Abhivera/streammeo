import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AppConfig } from "../config.js";
import { createAuthHook, signToken } from "./middleware.js";
import { slugify } from "@streammeo/shared";

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

export async function registerAuthRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);

  app.post("/api/v1/auth/register", async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", details: body.error.flatten() });
    }

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10);
    let slug = slugify(body.data.workspaceName);
    const slugTaken = await prisma.workspace.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.data.email,
          password: passwordHash,
          name: body.data.name,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: body.data.workspaceName,
          slug,
          members: {
            create: { userId: user.id, role: "admin" },
          },
          inboxes: {
            create: {
              name: "Support",
              email: `support@${slug}.streammeo.local`,
              isDefault: true,
            },
          },
          slaPolicies: {
            create: {
              name: "Standard SLA",
              firstResponseMinutes: 240,
              resolutionMinutes: 1440,
              isDefault: true,
            },
          },
        },
      });

      return { user, workspace };
    });

    const token = signToken(
      {
        userId: result.user.id,
        workspaceId: result.workspace.id,
        email: result.user.email,
        role: "admin",
      },
      config.JWT_SECRET,
    );

    return reply.code(201).send({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
        plan: result.workspace.plan,
        apiKey: result.workspace.apiKey,
      },
    });
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const user = await prisma.user.findUnique({
      where: { email: body.data.email },
      include: {
        memberships: { take: 1, orderBy: { workspace: { createdAt: "asc" } } },
      },
    });

    if (!user || !(await bcrypt.compare(body.data.password, user.password))) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return reply.code(403).send({ error: "No workspace membership" });
    }

    const token = signToken(
      {
        userId: user.id,
        workspaceId: membership.workspaceId,
        email: user.email,
        role: membership.role,
      },
      config.JWT_SECRET,
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: { id: membership.workspaceId },
    };
  });

  app.get("/api/v1/auth/me", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: authPayload.userId },
      include: {
        memberships: {
          where: { workspaceId: authPayload.workspaceId },
          include: { workspace: true },
        },
      },
    });

    if (!user) return reply.code(404).send({ error: "User not found" });

    const membership = user.memberships[0];
    if (!membership) return reply.code(404).send({ error: "Workspace not found" });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: membership.role },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        plan: membership.workspace.plan,
        apiKey: membership.workspace.apiKey,
        ticketsUsed: membership.workspace.ticketsUsed,
        ticketsLimit: membership.workspace.ticketsLimit,
      },
    };
  });
}
