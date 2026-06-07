import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { createAuthHook } from "../auth/middleware.js";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@streammeo/shared";
import {
  addComment,
  bulkUpdateTickets,
  createPortalToken,
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
} from "./service.js";
import { sendOutboundEmail } from "../email/routes.js";
import { createCsatSurvey } from "../csat/routes.js";
import { prisma } from "../db.js";

const listQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  requesterEmail: z.string().email(),
  requesterName: z.string().optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  inboxId: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  subject: z.string().min(1).max(500).optional(),
});

const commentSchema = z.object({
  body: z.string().min(1),
  visibility: z.enum(["public", "internal"]).default("public"),
});

const bulkSchema = z.object({
  ticketIds: z.array(z.string()).min(1),
  status: z.enum(TICKET_STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  delete: z.boolean().optional(),
});

export async function registerTicketRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);

  app.get("/api/v1/tickets", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Invalid query" });

    const result = await listTickets({
      workspaceId: authPayload.workspaceId,
      ...query.data,
    });
    return result;
  });

  app.get("/api/v1/tickets/:id", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const ticket = await getTicketById(authPayload.workspaceId, id);
    if (!ticket) return reply.code(404).send({ error: "Ticket not found" });
    return ticket;
  });

  app.post("/api/v1/tickets", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    try {
      const ticket = await createTicket({
        workspaceId: authPayload.workspaceId,
        actorId: authPayload.userId,
        ...body.data,
      });
      return reply.code(201).send(ticket);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create ticket";
      return reply.code(400).send({ error: message });
    }
  });

  app.patch("/api/v1/tickets/:id", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = updateSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    try {
      const ticket = await updateTicket(
        authPayload.workspaceId,
        id,
        authPayload.userId,
        body.data,
      );
      if (!ticket) return reply.code(404).send({ error: "Ticket not found" });

      if (body.data.status === "resolved") {
        void createCsatSurvey(id, config).catch((err) =>
          app.log.warn({ err }, "CSAT survey creation failed"),
        );
      }

      return ticket;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update ticket";
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/v1/tickets/:id/comments", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = commentSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const comment = await addComment({
      workspaceId: authPayload.workspaceId,
      ticketId: id,
      authorId: authPayload.userId,
      body: body.data.body,
      visibility: body.data.visibility,
    });
    if (!comment) return reply.code(404).send({ error: "Ticket not found" });

    if (body.data.visibility === "public") {
      const ticket = await getTicketById(authPayload.workspaceId, id);
      if (ticket?.inbox?.email) {
        void sendOutboundEmail(config, {
          to: ticket.requesterEmail,
          from: ticket.inbox.email,
          subject: `Re: ${ticket.subject}`,
          body: body.data.body,
        }).catch((err) => app.log.warn({ err }, "Outbound email failed"));
      }
    }

    return reply.code(201).send(comment);
  });

  app.post("/api/v1/tickets/bulk", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = bulkSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const result = await bulkUpdateTickets(
      authPayload.workspaceId,
      authPayload.userId,
      body.data.ticketIds,
      body.data,
    );
    return result;
  });

  app.get("/api/v1/tickets/:id/portal-link", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const ticket = await getTicketById(authPayload.workspaceId, id);
    if (!ticket) return reply.code(404).send({ error: "Ticket not found" });

    const token = await createPortalToken(id);
    const url = `${config.FRONTEND_URL}/portal/ticket/${token}`;
    return { url, token };
  });

  app.get("/api/v1/tags", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const items = await prisma.tag.findMany({
      where: { workspaceId: authPayload.workspaceId },
      orderBy: { name: "asc" },
    });
    return { items };
  });
}
