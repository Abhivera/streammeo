import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AppConfig } from "../config.js";
import { createAuthHook, requireRole } from "../auth/middleware.js";
import { TICKET_PRIORITIES } from "@streammeo/shared";

const slaSchema = z.object({
  name: z.string().min(1).max(120),
  firstResponseMinutes: z.number().int().min(1),
  resolutionMinutes: z.number().int().min(1),
  priority: z.enum(TICKET_PRIORITIES).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function registerSlaRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);
  const adminOnly = [auth, requireRole("admin", "manager")];

  app.get("/api/v1/sla-policies", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const items = await prisma.slaPolicy.findMany({
      where: { workspaceId: authPayload.workspaceId },
      orderBy: { name: "asc" },
    });
    return { items };
  });

  app.post("/api/v1/sla-policies", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = slaSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    if (body.data.isDefault) {
      await prisma.slaPolicy.updateMany({
        where: { workspaceId: authPayload.workspaceId },
        data: { isDefault: false },
      });
    }

    const policy = await prisma.slaPolicy.create({
      data: {
        workspaceId: authPayload.workspaceId,
        ...body.data,
      },
    });
    return reply.code(201).send(policy);
  });

  app.patch("/api/v1/sla-policies/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = slaSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await prisma.slaPolicy.findFirst({
      where: { id, workspaceId: authPayload.workspaceId },
    });
    if (!existing) return reply.code(404).send({ error: "SLA policy not found" });

    if (body.data.isDefault) {
      await prisma.slaPolicy.updateMany({
        where: { workspaceId: authPayload.workspaceId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const policy = await prisma.slaPolicy.update({ where: { id }, data: body.data });
    return policy;
  });
}

export async function checkSlaBreaches(): Promise<number> {
  const openTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["new", "open", "pending"] },
      slaBreached: false,
      slaPolicyId: { not: null },
    },
    include: { slaPolicy: true },
  });

  let breached = 0;
  const now = Date.now();

  for (const ticket of openTickets) {
    if (!ticket.slaPolicy) continue;

    const ageMinutes = (now - ticket.createdAt.getTime()) / 60_000;
    const frtMinutes = ticket.firstResponseAt
      ? (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / 60_000
      : ageMinutes;

    const resolutionBreached = ageMinutes > ticket.slaPolicy.resolutionMinutes;
    const frtBreached =
      !ticket.firstResponseAt && ageMinutes > ticket.slaPolicy.firstResponseMinutes;

    if (resolutionBreached || frtBreached) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { slaBreached: true },
      });
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "sla.breached",
          payload: {
            firstResponseBreached: frtBreached,
            resolutionBreached,
          },
        },
      });
      breached += 1;
    }
  }

  return breached;
}
