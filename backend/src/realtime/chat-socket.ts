import type { Server } from "socket.io";

let io: Server | null = null;

export function setChatSocketServer(server: Server): void {
  io = server;
}

export type ChatMessagePayload = {
  role: string;
  body: string;
  createdAt: string;
  agentName?: string | null;
  attachments?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
    size: number;
  }>;
};

export type ChatSessionSummaryPayload = {
  id: string;
  visitorId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  status: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  lastMessage: ChatMessagePayload | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export function emitChatMessage(sessionId: string, message: ChatMessagePayload): void {
  io?.to(`chat:${sessionId}`).emit("chat:message", { sessionId, message });
}

export function emitChatSessionNew(workspaceId: string, session: ChatSessionSummaryPayload): void {
  io?.to(`workspace:${workspaceId}:chats`).emit("chat:session:new", session);
}

export function emitChatSessionUpdate(workspaceId: string, session: ChatSessionSummaryPayload): void {
  io?.to(`workspace:${workspaceId}:chats`).emit("chat:session:update", session);
}

export function emitChatSessionClosed(
  sessionId: string,
  payload: { csatEnabled: boolean; csatPrompt: string },
): void {
  io?.to(`chat:${sessionId}`).emit("chat:session:closed", { sessionId, ...payload });
}

export function emitChatTyping(
  sessionId: string,
  payload: { role: "visitor" | "agent"; typing: boolean; agentName?: string | null },
): void {
  io?.to(`chat:${sessionId}`).emit("chat:typing", { sessionId, ...payload });
}
