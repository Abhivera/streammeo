import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AppConfig } from "../config.js";
import { createAuthHook, requireRole } from "../auth/middleware.js";

const routingRuleSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

const inboxSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  autoResponderEnabled: z.boolean().optional(),
  autoResponderMessage: z.string().optional(),
  businessHoursStart: z.number().min(0).max(23).nullable().optional(),
  businessHoursEnd: z.number().min(0).max(23).nullable().optional(),
  routingRules: z.array(routingRuleSchema).optional(),
});

export async function registerInboxRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);
  const adminOnly = [auth, requireRole("admin", "manager")];

  app.get("/api/v1/inboxes", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const inboxes = await prisma.inbox.findMany({
      where: { workspaceId: authPayload.workspaceId },
      orderBy: { createdAt: "asc" },
    });
    return { items: inboxes };
  });

  app.post("/api/v1/inboxes", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = inboxSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const inbox = await prisma.inbox.create({
      data: {
        workspaceId: authPayload.workspaceId,
        name: body.data.name,
        email: body.data.email,
        autoResponderEnabled: body.data.autoResponderEnabled ?? false,
        autoResponderMessage: body.data.autoResponderMessage,
        businessHoursStart: body.data.businessHoursStart ?? undefined,
        businessHoursEnd: body.data.businessHoursEnd ?? undefined,
        routingRules: (body.data.routingRules ?? []) as Prisma.InputJsonValue,
      },
    });
    return reply.code(201).send(inbox);
  });

  app.patch("/api/v1/inboxes/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = inboxSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await prisma.inbox.findFirst({
      where: { id, workspaceId: authPayload.workspaceId },
    });
    if (!existing) return reply.code(404).send({ error: "Inbox not found" });

    const { routingRules, ...rest } = body.data;
    const inbox = await prisma.inbox.update({
      where: { id },
      data: {
        ...rest,
        ...(routingRules ? { routingRules: routingRules as Prisma.InputJsonValue } : {}),
      },
    });
    return inbox;
  });

  app.get("/api/v1/canned-responses", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const items = await prisma.cannedResponse.findMany({
      where: { workspaceId: authPayload.workspaceId },
      orderBy: { title: "asc" },
    });
    return { items };
  });

  const cannedSchema = z.object({
    title: z.string().min(1).max(120),
    body: z.string().min(1),
  });

  app.post("/api/v1/canned-responses", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = cannedSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const item = await prisma.cannedResponse.create({
      data: {
        workspaceId: authPayload.workspaceId,
        title: body.data.title,
        body: body.data.body,
      },
    });
    return reply.code(201).send(item);
  });

  app.patch("/api/v1/canned-responses/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = cannedSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await prisma.cannedResponse.findFirst({
      where: { id, workspaceId: authPayload.workspaceId },
    });
    if (!existing) return reply.code(404).send({ error: "Not found" });

    const item = await prisma.cannedResponse.update({ where: { id }, data: body.data });
    return item;
  });

  app.delete("/api/v1/canned-responses/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const existing = await prisma.cannedResponse.findFirst({
      where: { id, workspaceId: authPayload.workspaceId },
    });
    if (!existing) return reply.code(404).send({ error: "Not found" });

    await prisma.cannedResponse.delete({ where: { id } });
    return { ok: true };
  });
}
