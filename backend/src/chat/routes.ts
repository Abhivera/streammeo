import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createChatCsatSurvey,
  createChatMessage,
  createChatSession,
  enrichChatSessionDetail,
  enrichChatSessionSummary,
  getChatCsatSurvey,
  getChatSession,
  getUserById,
  getWorkspaceByApiKey,
  getWorkspaceById,
  listActiveChatSessions,
  mergeWidgetSettings,
  resolveWidgetConfig,
  searchKbForChat,
  updateChatCsatSurvey,
  updateWorkspace,
  updateChatSession,
} from "@streammeo/db";
import type { AppConfig } from "../config.js";
import { createAuthHook, requireRole } from "../auth/middleware.js";
import { createTicket } from "../tickets/service.js";
import { createUploadService } from "../uploads/service.js";
import {
  emitChatMessage,
  emitChatSessionClosed,
  emitChatSessionNew,
  emitChatSessionUpdate,
  type ChatSessionSummaryPayload,
} from "../realtime/chat-socket.js";

const messageSchema = z.string().min(1).max(5000);

const attachmentInputSchema = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  url: z.string().url().max(2000),
  size: z.number().int().min(1).max(2_000_000),
});

const startChatSchema = z.object({
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  message: messageSchema,
  attachments: z.array(attachmentInputSchema).max(3).optional(),
});

const chatMessageSchema = z.object({
  message: messageSchema,
  attachments: z.array(attachmentInputSchema).max(3).optional(),
});

const presignUploadSchema = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().min(1).max(2_000_000),
});

const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const localeStringsSchema = z
  .object({
    welcomeTitle: z.string().min(1).max(120).optional(),
    welcomeMessage: z.string().min(1).max(500).optional(),
    headerSubtitle: z.string().min(1).max(160).optional(),
    quickPrompts: z.array(z.string().min(1).max(120)).max(6).optional(),
    offlineTitle: z.string().min(1).max(120).optional(),
    offlineMessage: z.string().min(1).max(500).optional(),
    preChatNameLabel: z.string().min(1).max(80).optional(),
    preChatEmailLabel: z.string().min(1).max(80).optional(),
    proactiveMessage: z.string().min(1).max(200).optional(),
    csatPrompt: z.string().min(1).max(200).optional(),
  })
  .strict();

const widgetSettingsSchema = z
  .object({
    displayName: z.string().max(80).nullable().optional(),
    welcomeTitle: z.string().min(1).max(120).optional(),
    welcomeMessage: z.string().min(1).max(500).optional(),
    headerSubtitle: z.string().min(1).max(160).optional(),
    quickPrompts: z.array(z.string().min(1).max(120)).max(6).optional(),
    accentColor: hexColorSchema.optional(),
    panelBackground: hexColorSchema.optional(),
    chatBackground: hexColorSchema.optional(),
    textColor: hexColorSchema.optional(),
    mutedTextColor: hexColorSchema.optional(),
    position: z.enum(["bottom-right", "bottom-left"]).optional(),
    launcherStyle: z.enum(["circle", "rounded"]).optional(),
    requirePreChatName: z.boolean().optional(),
    requirePreChatEmail: z.boolean().optional(),
    preChatNameLabel: z.string().min(1).max(80).optional(),
    preChatEmailLabel: z.string().min(1).max(80).optional(),
    launcherIconUrl: z.string().url().max(2000).nullable().optional(),
    avatarUrl: z.string().url().max(2000).nullable().optional(),
    businessHoursEnabled: z.boolean().optional(),
    businessHoursStart: z.number().int().min(0).max(23).nullable().optional(),
    businessHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
    businessHoursTimezone: z.string().min(1).max(80).optional(),
    offlineTitle: z.string().min(1).max(120).optional(),
    offlineMessage: z.string().min(1).max(500).optional(),
    proactiveEnabled: z.boolean().optional(),
    proactiveDelaySeconds: z.number().int().min(3).max(300).optional(),
    proactiveMessage: z.string().min(1).max(200).optional(),
    csatEnabled: z.boolean().optional(),
    csatPrompt: z.string().min(1).max(200).optional(),
    fileUploadEnabled: z.boolean().optional(),
    defaultLocale: z.string().min(2).max(10).optional(),
    locales: z.record(z.string(), localeStringsSchema).optional(),
    widgets: z.record(z.string(), z.object({}).passthrough()).optional(),
  })
  .strict();

type WorkspaceRow = NonNullable<Awaited<ReturnType<typeof resolveWorkspace>>>;

function getApiKey(request: FastifyRequest): string | undefined {
  return request.headers["x-api-key"] as string | undefined;
}

function mapMessage(m: {
  role: string;
  body: string;
  createdAt: string;
  attachments?: Array<{ id: string; name: string; mimeType: string; url: string; size: number }>;
}) {
  return {
    role: m.role,
    body: m.body,
    createdAt: m.createdAt,
    attachments: m.attachments,
  };
}

function mapAttachments(
  items: Array<{ name: string; mimeType: string; url: string; size: number }>,
  isAllowedUrl: (url: string) => boolean,
) {
  return items
    .filter((item) => ALLOWED_UPLOAD_TYPES.has(item.mimeType))
    .filter((item) => isAllowedUrl(item.url))
    .map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      mimeType: item.mimeType,
      url: item.url,
      size: item.size,
    }));
}

async function resolveWorkspace(apiKey: string | undefined) {
  if (!apiKey) return null;
  const workspace = await getWorkspaceByApiKey(apiKey);
  if (!workspace?.widgetEnabled) return null;
  return workspace;
}

async function requireWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<WorkspaceRow | null> {
  const workspace = await resolveWorkspace(getApiKey(request));
  if (!workspace) {
    await reply.code(404).send({ error: "Workspace not found" });
    return null;
  }
  return workspace;
}

async function buildBotReply(workspaceId: string, workspaceName: string, visitorMessage: string) {
  const articles = await searchKbForChat(workspaceId, visitorMessage);
  if (articles.length > 0) {
    const noun = articles.length === 1 ? "an article" : "a few articles";
    return { body: `I found ${noun} that might help while you wait for an agent:`, articles };
  }
  return {
    body: `Thanks for reaching out to ${workspaceName}! A support agent will be with you shortly. Feel free to share any extra details that might help.`,
    articles: [],
  };
}

async function createBotMessage(sessionId: string, workspaceId: string, workspaceName: string, visitorMessage: string) {
  const { body, articles } = await buildBotReply(workspaceId, workspaceName, visitorMessage);
  const botMsg = await createChatMessage({ sessionId, role: "bot", body });
  return { botMsg, articles };
}

async function toSessionSummary(sessionId: string): Promise<ChatSessionSummaryPayload | null> {
  const session = await getChatSession(sessionId);
  if (!session) return null;
  const enriched = await enrichChatSessionSummary(session);
  return {
    id: session.id,
    visitorId: session.visitorId,
    visitorEmail: session.visitorEmail,
    visitorName: session.visitorName,
    status: session.status,
    assignedAgentId: session.assignedAgentId,
    assignedAgentName: enriched.assignedAgent?.name ?? enriched.assignedAgent?.email ?? null,
    lastMessage: enriched.lastMessage ? mapMessage(enriched.lastMessage) : null,
    messageCount: enriched.messageCount,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

async function requireAgentSession(request: FastifyRequest, reply: FastifyReply, sessionId: string) {
  if (!request.auth) {
    await reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  const session = await getChatSession(sessionId);
  if (!session || session.workspaceId !== request.auth.workspaceId) {
    await reply.code(404).send({ error: "Session not found" });
    return null;
  }
  return session;
}

export async function registerChatRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);
  const uploads =
    config.UPLOADS_BUCKET && config.UPLOADS_CDN_URL
      ? createUploadService({
          bucket: config.UPLOADS_BUCKET,
          cdnUrl: config.UPLOADS_CDN_URL,
        })
      : null;
  const isAllowedUrl = uploads?.isAllowedUrl ?? (() => false);

  app.get("/api/v1/workspace/widget-config", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    const query = request.query as { locale?: string; widgetId?: string };
    return {
      slug: workspace.slug,
      widgetEnabled: workspace.widgetEnabled,
      ...resolveWidgetConfig(workspace, {
        locale: query.locale,
        widgetId: query.widgetId,
      }),
    };
  });

  app.get(
    "/api/v1/workspace/widget-settings",
    { preHandler: [auth] },
    async (request, reply) => {
      if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
      const workspace = await getWorkspaceById(request.auth.workspaceId);
      if (!workspace) return reply.code(404).send({ error: "Workspace not found" });
      return {
        widgetEnabled: workspace.widgetEnabled,
        settings: mergeWidgetSettings(workspace.widgetSettings),
      };
    },
  );

  app.patch(
    "/api/v1/workspace/widget-settings",
    { preHandler: [auth, requireRole("admin", "manager")] },
    async (request, reply) => {
      if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
      const body = widgetSettingsSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: "Invalid input", details: body.error.flatten() });
      }

      const workspace = await getWorkspaceById(request.auth.workspaceId);
      if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

      const settings = mergeWidgetSettings({
        ...workspace.widgetSettings,
        ...body.data,
      });

      const updated = await updateWorkspace(workspace.id, { widgetSettings: settings });
      if (!updated) return reply.code(404).send({ error: "Workspace not found" });

      return {
        widgetEnabled: updated.widgetEnabled,
        settings,
      };
    },
  );

  app.post("/api/v1/chat/uploads/presign", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    if (!uploads) {
      return reply.code(503).send({ error: "File uploads are not configured" });
    }

    const body = presignUploadSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });
    if (!ALLOWED_UPLOAD_TYPES.has(body.data.mimeType)) {
      return reply.code(400).send({ error: "Unsupported file type" });
    }

    return uploads.presignUpload({
      workspaceId: workspace.id,
      name: body.data.name,
      mimeType: body.data.mimeType,
      size: body.data.size,
    });
  });

  app.get("/api/v1/chat/:sessionId", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    const { sessionId } = request.params as { sessionId: string };
    const session = await getChatSession(sessionId);
    if (!session || session.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: "Session not found" });
    }
    const { messages } = await enrichChatSessionDetail(session);
    const csat = await getChatCsatSurvey(session.id);
    return {
      sessionId: session.id,
      visitorId: session.visitorId,
      status: session.status,
      messages: messages.map(mapMessage),
      csatResponded: !!csat?.respondedAt,
    };
  });

  app.post("/api/v1/chat/start", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    const body = startChatSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const visitorId = crypto.randomUUID();
    const attachments = body.data.attachments
      ? mapAttachments(body.data.attachments, isAllowedUrl)
      : undefined;
    const { session, messages } = await createChatSession({
      workspaceId: workspace.id,
      visitorId,
      visitorEmail: body.data.visitorEmail,
      visitorName: body.data.visitorName,
      initialMessage: body.data.message,
      initialAttachments: attachments,
    });

    const { botMsg, articles } = await createBotMessage(session.id, workspace.id, workspace.name, body.data.message);
    const summary = await toSessionSummary(session.id);
    if (summary) emitChatSessionNew(workspace.id, summary);

    return reply.code(201).send({
      sessionId: session.id,
      visitorId,
      messages: [...messages.map(mapMessage), mapMessage(botMsg)],
      articles,
    });
  });

  app.post("/api/v1/chat/:sessionId/message", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    const { sessionId } = request.params as { sessionId: string };
    const body = chatMessageSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const session = await getChatSession(sessionId);
    if (!session || session.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: "Session not found" });
    }
    if (session.status !== "active") {
      return reply.code(400).send({ error: "Chat session is closed" });
    }

    const visitorMsg = await createChatMessage({
      sessionId,
      role: "visitor",
      body: body.data.message,
      attachments: body.data.attachments
        ? mapAttachments(body.data.attachments, isAllowedUrl)
        : undefined,
    });
    const visitorPayload = mapMessage(visitorMsg);
    emitChatMessage(sessionId, visitorPayload);

    const summary = await toSessionSummary(sessionId);
    if (summary) emitChatSessionUpdate(workspace.id, summary);

    if (session.assignedAgentId) return { message: visitorPayload };

    const { botMsg, articles } = await createBotMessage(sessionId, workspace.id, workspace.name, body.data.message);
    const replyPayload = mapMessage(botMsg);
    emitChatMessage(sessionId, replyPayload);
    return { message: visitorPayload, reply: replyPayload, articles };
  });

  app.post("/api/v1/chat/:sessionId/convert", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    const { sessionId } = request.params as { sessionId: string };
    const session = await getChatSession(sessionId);
    if (!session || session.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: "Session not found" });
    }
    if (session.ticketId) return { ticketId: session.ticketId, alreadyConverted: true };

    const { messages } = await enrichChatSessionDetail(session);
    const transcript = messages.map((m) => `${m.role}: ${m.body}`).join("\n\n");
    const email = session.visitorEmail ?? `visitor+${session.visitorId.slice(0, 8)}@chat.local`;

    const ticket = await createTicket({
      workspaceId: session.workspaceId,
      subject: `Chat from ${session.visitorName ?? "Visitor"}`,
      body: transcript,
      requesterEmail: email,
      requesterName: session.visitorName ?? undefined,
    });

    if (!ticket) {
      return reply.code(500).send({ error: "Failed to create ticket" });
    }

    await updateChatSession(sessionId, { ticketId: ticket.id, status: "converted" });
    const summary = await toSessionSummary(sessionId);
    if (summary) emitChatSessionUpdate(workspace.id, summary);
    return { ticketId: ticket.id, ticketNumber: ticket.number };
  });

  app.get("/api/v1/agent/chat/sessions", { preHandler: auth }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
    const sessions = await listActiveChatSessions(request.auth.workspaceId);
    const items = await Promise.all(
      sessions.map(async (session) => {
        const enriched = await enrichChatSessionSummary(session);
        return {
          id: session.id,
          visitorId: session.visitorId,
          visitorEmail: session.visitorEmail,
          visitorName: session.visitorName,
          status: session.status,
          assignedAgentId: session.assignedAgentId,
          assignedAgent: enriched.assignedAgent,
          lastMessage: enriched.lastMessage ? mapMessage(enriched.lastMessage) : null,
          messageCount: enriched.messageCount,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      }),
    );
    return { items };
  });

  app.get("/api/v1/agent/chat/:sessionId", { preHandler: auth }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
    const { sessionId } = request.params as { sessionId: string };
    const session = await getChatSession(sessionId);
    if (!session || session.workspaceId !== request.auth.workspaceId) {
      return reply.code(404).send({ error: "Session not found" });
    }
    const { messages, assignedAgent } = await enrichChatSessionDetail(session);
    return {
      id: session.id,
      visitorId: session.visitorId,
      visitorEmail: session.visitorEmail,
      visitorName: session.visitorName,
      status: session.status,
      ticketId: session.ticketId,
      assignedAgent,
      messages: messages.map(mapMessage),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  });

  app.post("/api/v1/agent/chat/:sessionId/claim", { preHandler: auth }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
    const { sessionId } = request.params as { sessionId: string };
    const session = await requireAgentSession(request, reply, sessionId);
    if (!session) return;
    if (session.status !== "active") return reply.code(400).send({ error: "Chat session is not active" });

    const agent = await getUserById(request.auth.userId);
    const agentName = agent?.name ?? agent?.email ?? "Support";
    await updateChatSession(sessionId, { assignedAgentId: request.auth.userId });
    const joinMsg = await createChatMessage({
      sessionId,
      role: "bot",
      body: `${agentName} has joined the chat and will help you now.`,
    });
    const joinPayload = { ...mapMessage(joinMsg), agentName };
    emitChatMessage(sessionId, joinPayload);
    const summary = await toSessionSummary(sessionId);
    if (summary) emitChatSessionUpdate(request.auth.workspaceId, summary);
    return { sessionId, assignedAgentId: request.auth.userId, joinMessage: joinPayload };
  });

  app.post("/api/v1/agent/chat/:sessionId/reply", { preHandler: auth }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
    const { sessionId } = request.params as { sessionId: string };
    const body = chatMessageSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const session = await requireAgentSession(request, reply, sessionId);
    if (!session) return;
    if (session.status !== "active") return reply.code(400).send({ error: "Chat session is closed" });

    const agent = await getUserById(request.auth.userId);
    const agentName = agent?.name ?? agent?.email ?? "Agent";

    if (!session.assignedAgentId) {
      await updateChatSession(sessionId, { assignedAgentId: request.auth.userId });
      const joinMsg = await createChatMessage({
        sessionId,
        role: "bot",
        body: `${agentName} has joined the chat and will help you now.`,
      });
      emitChatMessage(sessionId, { ...mapMessage(joinMsg), agentName });
    } else if (session.assignedAgentId !== request.auth.userId) {
      return reply.code(403).send({ error: "Chat is assigned to another agent" });
    }

    const agentMsg = await createChatMessage({ sessionId, role: "agent", body: body.data.message });
    const payload = { ...mapMessage(agentMsg), agentName };
    emitChatMessage(sessionId, payload);
    const summary = await toSessionSummary(sessionId);
    if (summary) emitChatSessionUpdate(request.auth.workspaceId, summary);
    return { message: payload };
  });

  app.post("/api/v1/agent/chat/:sessionId/close", { preHandler: auth }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
    const { sessionId } = request.params as { sessionId: string };
    const session = await requireAgentSession(request, reply, sessionId);
    if (!session) return;
    if (session.status !== "active") return reply.code(400).send({ error: "Chat session is already closed" });

    await updateChatSession(sessionId, { status: "closed" });
    const summary = await toSessionSummary(sessionId);
    if (summary) emitChatSessionUpdate(request.auth.workspaceId, summary);

    const workspace = await getWorkspaceById(session.workspaceId);
    const settings = mergeWidgetSettings(workspace?.widgetSettings);
    if (settings.csatEnabled) {
      await createChatCsatSurvey(sessionId);
      emitChatSessionClosed(sessionId, {
        csatEnabled: true,
        csatPrompt: settings.csatPrompt,
      });
    } else {
      emitChatSessionClosed(sessionId, { csatEnabled: false, csatPrompt: "" });
    }

    return { ok: true };
  });

  app.post("/api/v1/chat/:sessionId/csat", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;
    const { sessionId } = request.params as { sessionId: string };
    const body = z
      .object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const session = await getChatSession(sessionId);
    if (!session || session.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: "Session not found" });
    }

    const existing = await getChatCsatSurvey(sessionId);
    if (!existing) await createChatCsatSurvey(sessionId);
    const survey = await getChatCsatSurvey(sessionId);
    if (survey?.respondedAt) {
      return reply.code(409).send({ error: "Survey already submitted" });
    }

    await updateChatCsatSurvey(sessionId, {
      rating: body.data.rating,
      comment: body.data.comment ?? null,
      respondedAt: new Date().toISOString(),
    });

    return { ok: true };
  });

  app.post("/api/v1/agent/chat/:sessionId/convert", { preHandler: auth }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
    const { sessionId } = request.params as { sessionId: string };
    const session = await getChatSession(sessionId);
    if (!session || session.workspaceId !== request.auth.workspaceId) {
      return reply.code(404).send({ error: "Session not found" });
    }
    if (session.ticketId) return { ticketId: session.ticketId, alreadyConverted: true };

    const { messages } = await enrichChatSessionDetail(session);
    const transcript = messages.map((m) => `${m.role}: ${m.body}`).join("\n\n");
    const email = session.visitorEmail ?? `visitor+${session.visitorId.slice(0, 8)}@chat.local`;

    const ticket = await createTicket({
      workspaceId: session.workspaceId,
      subject: `Chat from ${session.visitorName ?? "Visitor"}`,
      body: transcript,
      requesterEmail: email,
      requesterName: session.visitorName ?? undefined,
    });

    if (!ticket) {
      return reply.code(500).send({ error: "Failed to create ticket" });
    }

    await updateChatSession(sessionId, { ticketId: ticket.id, status: "converted" });
    const summary = await toSessionSummary(sessionId);
    if (summary) emitChatSessionUpdate(request.auth.workspaceId, summary);
    return { ticketId: ticket.id, ticketNumber: ticket.number };
  });
}
