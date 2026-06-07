import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { addComment } from "../tickets/service.js";

export async function registerPortalRoutes(app: FastifyInstance, _config: AppConfig): Promise<void> {
  app.get("/api/v1/portal/ticket/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const portalToken = await prisma.portalToken.findUnique({
      where: { token },
      include: {
        ticket: {
          include: {
            comments: {
              where: { visibility: "public" },
              orderBy: { createdAt: "asc" },
              select: { id: true, body: true, createdAt: true, author: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!portalToken || portalToken.expiresAt < new Date()) {
      return reply.code(404).send({ error: "Link expired or invalid" });
    }

    const t = portalToken.ticket;
    return {
      number: t.number,
      subject: t.subject,
      status: t.status,
      requesterEmail: t.requesterEmail,
      comments: t.comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        authorName: c.author?.name ?? "Support",
      })),
    };
  });

  app.post("/api/v1/portal/ticket/:token/reply", async (request, reply) => {
    const { token } = request.params as { token: string };
    const body = z.object({ message: z.string().min(1).max(10000) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const portalToken = await prisma.portalToken.findUnique({
      where: { token },
      include: { ticket: true },
    });

    if (!portalToken || portalToken.expiresAt < new Date()) {
      return reply.code(404).send({ error: "Link expired or invalid" });
    }

    const ticket = portalToken.ticket;
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
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "open", resolvedAt: null },
      });
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "ticket.reopened",
          payload: { source: "portal" },
        },
      });
    }

    return { ok: true };
  });
}
