import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { createTicket } from "../tickets/service.js";

const startChatSchema = z.object({
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  message: z.string().min(1).max(5000),
});

export async function registerChatRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.post("/api/v1/chat/start", async (request, reply) => {
    const apiKey = request.headers["x-api-key"] as string | undefined;
    if (!apiKey) return reply.code(401).send({ error: "Missing x-api-key header" });

    const workspace = await prisma.workspace.findUnique({ where: { apiKey } });
    if (!workspace || !workspace.widgetEnabled) {
      return reply.code(404).send({ error: "Workspace not found" });
    }

    const body = startChatSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const visitorId = crypto.randomUUID();
    const session = await prisma.chatSession.create({
      data: {
        workspaceId: workspace.id,
        visitorId,
        visitorEmail: body.data.visitorEmail,
        visitorName: body.data.visitorName,
        messages: {
          create: { role: "visitor", body: body.data.message },
        },
      },
      include: { messages: true },
    });

    const botReply =
      "Thanks for your message! A support agent will be with you shortly. You can also browse our help articles while you wait.";

    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "bot", body: botReply },
    });

    return reply.code(201).send({
      sessionId: session.id,
      visitorId,
      messages: [
        ...session.messages.map((m) => ({
          role: m.role,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
        { role: "bot", body: botReply, createdAt: new Date().toISOString() },
      ],
    });
  });

  app.post("/api/v1/chat/:sessionId/message", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const apiKey = request.headers["x-api-key"] as string | undefined;
    if (!apiKey) return reply.code(401).send({ error: "Missing x-api-key header" });

    const body = z.object({ message: z.string().min(1).max(5000) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { workspace: true },
    });
    if (!session || session.workspace.apiKey !== apiKey) {
      return reply.code(404).send({ error: "Session not found" });
    }
    if (session.status !== "active") {
      return reply.code(400).send({ error: "Chat session is closed" });
    }

    const msg = await prisma.chatMessage.create({
      data: { sessionId, role: "visitor", body: body.data.message },
    });

    return {
      message: {
        role: msg.role,
        body: msg.body,
        createdAt: msg.createdAt.toISOString(),
      },
    };
  });

  app.post("/api/v1/chat/:sessionId/convert", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const apiKey = request.headers["x-api-key"] as string | undefined;
    if (!apiKey) return reply.code(401).send({ error: "Missing x-api-key header" });

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { workspace: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!session || session.workspace.apiKey !== apiKey) {
      return reply.code(404).send({ error: "Session not found" });
    }
    if (session.ticketId) {
      return { ticketId: session.ticketId, alreadyConverted: true };
    }

    const transcript = session.messages.map((m) => `${m.role}: ${m.body}`).join("\n\n");
    const email = session.visitorEmail ?? `visitor+${session.visitorId.slice(0, 8)}@chat.local`;

    const ticket = await createTicket({
      workspaceId: session.workspaceId,
      subject: `Chat from ${session.visitorName ?? "Visitor"}`,
      body: transcript,
      requesterEmail: email,
      requesterName: session.visitorName ?? undefined,
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { ticketId: ticket.id, status: "converted" },
    });

    return { ticketId: ticket.id, ticketNumber: ticket.number };
  });

  app.get("/api/v1/workspace/widget-config", async (request, reply) => {
    const apiKey = request.headers["x-api-key"] as string | undefined;
    if (!apiKey) return reply.code(401).send({ error: "Missing x-api-key header" });

    const workspace = await prisma.workspace.findUnique({
      where: { apiKey },
      select: { name: true, slug: true, widgetEnabled: true },
    });
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    return {
      ...workspace,
      apiUrl: config.FRONTEND_URL ? undefined : `http://localhost:${config.PORT}`,
    };
  });
}
