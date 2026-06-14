import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createTicketEvent,
  getTicketComments,
  getUserById,
  resolvePortalTicket,
  updateTicketRecord,
} from "@streammeo/db";
import type { AppConfig } from "../config.js";
import { addComment } from "../tickets/service.js";

export async function registerPortalRoutes(app: FastifyInstance, _config: AppConfig): Promise<void> {
  app.get("/api/v1/portal/ticket/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const resolved = await resolvePortalTicket(token);
    if (!resolved) return reply.code(404).send({ error: "Link expired or invalid" });

    const comments = (await getTicketComments(resolved.ticket.id)).filter(
      (c) => c.visibility === "public",
    );

    const enriched = await Promise.all(
      comments.map(async (c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        authorName: c.authorId ? (await getUserById(c.authorId))?.name ?? "Support" : "Support",
      })),
    );

    const t = resolved.ticket;
    return {
      number: t.number,
      subject: t.subject,
      status: t.status,
      requesterEmail: t.requesterEmail,
      comments: enriched,
    };
  });

  app.post("/api/v1/portal/ticket/:token/reply", async (request, reply) => {
    const { token } = request.params as { token: string };
    const body = z.object({ message: z.string().min(1).max(10000) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const resolved = await resolvePortalTicket(token);
    if (!resolved) return reply.code(404).send({ error: "Link expired or invalid" });

    const ticket = resolved.ticket;
    if (ticket.status === "closed") {
      return reply.code(400).send({ error: "Ticket is closed" });
    }

    await addComment({
      workspaceId: ticket.workspaceId,
      ticketId: ticket.id,
      body: body.data.message,
      visibility: "public",
      isEmail: true,
    });

    if (ticket.status === "resolved" || ticket.status === "pending") {
      await updateTicketRecord(ticket.workspaceId, ticket.id, {
        status: "open",
        resolvedAt: null,
      });
      await createTicketEvent({
        ticketId: ticket.id,
        eventType: "ticket.reopened",
        payload: { source: "portal" },
      });
    }

    return { ok: true };
  });
}
