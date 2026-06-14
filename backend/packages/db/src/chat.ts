import type { ChatAttachment, ChatCsatSurvey, ChatMessage, ChatSession, ChatSessionStatus } from "./types.js";
import { getUserById, toUserPublic } from "./users.js";
import { getItem, newId, nowIso, putItem, queryGsi1, queryPk, type DbItem } from "./store.js";
import { workspacePk } from "./tickets.js";

type SessionItem = DbItem & ChatSession & { entityType: "chat_session" };
type MessageItem = DbItem & ChatMessage & { entityType: "chat_message" };

function sessionPk(id: string) {
  return `CHAT#${id}`;
}

function sessionGsi1pk(workspaceId: string, status: ChatSessionStatus) {
  return `WS#${workspaceId}#CHAT#${status}`;
}

async function saveSession(session: ChatSession): Promise<void> {
  await putItem({
    pk: sessionPk(session.id),
    sk: "META",
    entityType: "chat_session",
    gsi1pk: sessionGsi1pk(session.workspaceId, session.status),
    gsi1sk: `${session.updatedAt}#${session.id}`,
    ...session,
  });
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const item = await getItem<SessionItem>(sessionPk(sessionId), "META");
  return item ? stripSession(item) : null;
}

export async function createChatSession(input: {
  workspaceId: string;
  visitorId: string;
  visitorEmail?: string | null;
  visitorName?: string | null;
  initialMessage?: string;
  initialAttachments?: ChatAttachment[];
}): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  const id = newId();
  const createdAt = nowIso();
  const session: ChatSession = {
    id,
    workspaceId: input.workspaceId,
    ticketId: null,
    visitorId: input.visitorId,
    visitorEmail: input.visitorEmail ?? null,
    visitorName: input.visitorName ?? null,
    assignedAgentId: null,
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
  await saveSession(session);

  const messages: ChatMessage[] = [];
  if (input.initialMessage) {
    const msg = await createChatMessage({
      sessionId: id,
      role: "visitor",
      body: input.initialMessage,
      attachments: input.initialAttachments,
    });
    messages.push(msg);
  }
  return { session, messages };
}

export async function updateChatSession(
  sessionId: string,
  patch: Partial<ChatSession>,
): Promise<ChatSession | null> {
  const existing = await getChatSession(sessionId);
  if (!existing) return null;
  const updated: ChatSession = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? nowIso(),
  };
  await saveSession(updated);
  return updated;
}

export async function listActiveChatSessions(workspaceId: string): Promise<ChatSession[]> {
  const { items } = await queryGsi1<SessionItem>(sessionGsi1pk(workspaceId, "active"), {
    scanForward: false,
  });
  return items.map(stripSession);
}

export async function listChatSessionsByStatus(
  workspaceId: string,
  status: ChatSessionStatus,
): Promise<ChatSession[]> {
  const { items } = await queryGsi1<SessionItem>(sessionGsi1pk(workspaceId, status), {
    scanForward: false,
  });
  return items.map(stripSession);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const items = await queryPk<MessageItem>(sessionPk(sessionId), "MSG#");
  return items.map(stripMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createChatMessage(input: {
  sessionId: string;
  role: string;
  body: string;
  attachments?: ChatAttachment[];
}): Promise<ChatMessage> {
  const id = newId();
  const createdAt = nowIso();
  const message: ChatMessage = {
    id,
    sessionId: input.sessionId,
    role: input.role,
    body: input.body,
    createdAt,
    attachments: input.attachments?.length ? input.attachments : undefined,
  };
  await putItem({
    pk: sessionPk(input.sessionId),
    sk: `MSG#${createdAt}#${id}`,
    entityType: "chat_message",
    ...message,
  });

  const session = await getChatSession(input.sessionId);
  if (session) {
    await saveSession({ ...session, updatedAt: createdAt });
  }

  return message;
}

export async function enrichChatSessionSummary(session: ChatSession) {
  const messages = await getChatMessages(session.id);
  const last = messages[messages.length - 1] ?? null;
  const agent = session.assignedAgentId ? await getUserById(session.assignedAgentId) : null;
  return {
    session,
    assignedAgent: agent ? toUserPublic(agent) : null,
    lastMessage: last,
    messageCount: messages.length,
  };
}

export async function enrichChatSessionDetail(session: ChatSession) {
  const messages = await getChatMessages(session.id);
  const agent = session.assignedAgentId ? await getUserById(session.assignedAgentId) : null;
  return { session, messages, assignedAgent: agent ? toUserPublic(agent) : null };
}

function stripSession(item: SessionItem): ChatSession {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    ticketId: item.ticketId,
    visitorId: item.visitorId,
    visitorEmail: item.visitorEmail,
    visitorName: item.visitorName,
    assignedAgentId: item.assignedAgentId,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function stripMessage(item: MessageItem): ChatMessage {
  return {
    id: item.id,
    sessionId: item.sessionId,
    role: item.role,
    body: item.body,
    createdAt: item.createdAt,
    attachments: item.attachments,
  };
}

type CsatItem = DbItem & ChatCsatSurvey & { entityType: "chat_csat" };

export async function getChatCsatSurvey(sessionId: string): Promise<ChatCsatSurvey | null> {
  const item = await getItem<CsatItem>(sessionPk(sessionId), "CSAT");
  if (!item) return null;
  return {
    sessionId: item.sessionId,
    rating: item.rating,
    comment: item.comment,
    respondedAt: item.respondedAt,
  };
}

export async function createChatCsatSurvey(sessionId: string): Promise<ChatCsatSurvey> {
  const existing = await getChatCsatSurvey(sessionId);
  if (existing) return existing;

  const survey: ChatCsatSurvey = {
    sessionId,
    rating: null,
    comment: null,
    respondedAt: null,
  };
  await putItem({
    pk: sessionPk(sessionId),
    sk: "CSAT",
    entityType: "chat_csat",
    ...survey,
  });
  return survey;
}

export async function updateChatCsatSurvey(
  sessionId: string,
  patch: Partial<Pick<ChatCsatSurvey, "rating" | "comment" | "respondedAt">>,
): Promise<ChatCsatSurvey | null> {
  const existing = await getChatCsatSurvey(sessionId);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await putItem({
    pk: sessionPk(sessionId),
    sk: "CSAT",
    entityType: "chat_csat",
    ...updated,
  });
  return updated;
}

export async function listChatCsatRatingsForWorkspace(workspaceId: string): Promise<number[]> {
  const closed = await listChatSessionsByStatus(workspaceId, "closed");
  const converted = await listChatSessionsByStatus(workspaceId, "converted");
  const ratings: number[] = [];
  for (const session of [...closed, ...converted]) {
    const survey = await getChatCsatSurvey(session.id);
    if (survey?.rating != null) ratings.push(survey.rating);
  }
  return ratings;
}
