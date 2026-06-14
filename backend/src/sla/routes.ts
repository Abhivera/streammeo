import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  clearDefaultSlaPolicies,
  createSlaPolicy,
  getSlaPolicy,
  listOpenSlaTickets,
  listSlaPolicies,
  updateSlaPolicy,
  createTicketEvent,
  updateTicketRecord,
} from "@streammeo/db";
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

    const items = await listSlaPolicies(authPayload.workspaceId);
    return { items };
  });

  app.post("/api/v1/sla-policies", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = slaSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    if (body.data.isDefault) {
      await clearDefaultSlaPolicies(authPayload.workspaceId);
    }

    const policy = await createSlaPolicy(authPayload.workspaceId, {
      name: body.data.name,
      firstResponseMinutes: body.data.firstResponseMinutes,
      resolutionMinutes: body.data.resolutionMinutes,
      priority: body.data.priority ?? null,
      isDefault: body.data.isDefault ?? false,
    });
    return reply.code(201).send(policy);
  });

  app.patch("/api/v1/sla-policies/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = slaSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await getSlaPolicy(authPayload.workspaceId, id);
    if (!existing) return reply.code(404).send({ error: "SLA policy not found" });

    if (body.data.isDefault) {
      await clearDefaultSlaPolicies(authPayload.workspaceId, id);
    }

    const policy = await updateSlaPolicy(authPayload.workspaceId, id, body.data);
    return policy;
  });
}

export async function checkSlaBreaches(): Promise<number> {
  const openTickets = await listOpenSlaTickets();
  let breached = 0;
  const now = Date.now();

  for (const ticket of openTickets) {
    if (!ticket.slaPolicy) continue;

    const created = new Date(ticket.createdAt).getTime();
    const ageMinutes = (now - created) / 60_000;
    const frtMinutes = ticket.firstResponseAt
      ? (new Date(ticket.firstResponseAt).getTime() - created) / 60_000
      : ageMinutes;

    const resolutionBreached = ageMinutes > ticket.slaPolicy.resolutionMinutes;
    const frtBreached = frtMinutes > ticket.slaPolicy.firstResponseMinutes;

    if (resolutionBreached || frtBreached) {
      await updateTicketRecord(ticket.workspaceId, ticket.id, { slaBreached: true });
      await createTicketEvent({
        ticketId: ticket.id,
        eventType: "sla.breached",
        payload: { firstResponseBreached: frtBreached, resolutionBreached },
      });
      breached += 1;
    }
  }

  return breached;
}
