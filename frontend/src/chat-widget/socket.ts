import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "./types";

type ChatMessageEvent = {
  sessionId: string;
  message: ChatMessage & { agentName?: string | null };
};

type ChatTypingEvent = {
  sessionId: string;
  role: "visitor" | "agent";
  typing: boolean;
  agentName?: string | null;
};

type ChatClosedEvent = {
  sessionId: string;
  csatEnabled: boolean;
  csatPrompt: string;
};

export type ChatSocketHandlers = {
  onMessage: (message: ChatMessageEvent["message"]) => void;
  onTyping?: (payload: ChatTypingEvent) => void;
  onSessionClosed?: (payload: ChatClosedEvent) => void;
};

export function createChatSocket(
  apiBase: string,
  sessionId: string,
  visitorId: string,
  handlers: ChatSocketHandlers,
): { disconnect: () => void; emitTyping: (typing: boolean) => void } | null {
  let socketUrl: string;
  try {
    socketUrl = new URL(apiBase).origin;
  } catch {
    return null;
  }

  const socket: Socket = io(socketUrl, {
    path: "/socket.io",
    auth: { sessionId, visitorId },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    socket.emit("chat:session:join");
  });

  socket.on("chat:message", (payload: ChatMessageEvent) => {
    if (payload.sessionId !== sessionId) return;
    handlers.onMessage(payload.message);
  });

  socket.on("chat:typing", (payload: ChatTypingEvent) => {
    if (payload.sessionId !== sessionId) return;
    handlers.onTyping?.(payload);
  });

  socket.on("chat:session:closed", (payload: ChatClosedEvent) => {
    if (payload.sessionId !== sessionId) return;
    handlers.onSessionClosed?.(payload);
  });

  return {
    disconnect: () => socket.disconnect(),
    emitTyping: (typing: boolean) => socket.emit("chat:typing", { typing }),
  };
}
