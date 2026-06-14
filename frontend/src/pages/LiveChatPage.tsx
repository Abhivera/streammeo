import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  claimChatSession,
  closeChatSession,
  convertChatSession,
  fetchChatSession,
  fetchChatSessions,
  replyChatSession,
} from "../api/client";
import { isSocketIoEnabled, REMOTE_POLL_INTERVAL_MS } from "../config";
import { apiErrorMessage } from "../lib/apiError";
import { useAuthStore } from "../store/auth";
import type { ChatMessage, ChatSessionDetail, ChatSessionSummary } from "../types";

function visitorLabel(session: ChatSessionSummary | ChatSessionDetail): string {
  return session.visitorName ?? session.visitorEmail ?? "Visitor";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function messageAuthor(message: ChatMessage, workspaceName: string): string {
  if (message.role === "visitor") return "Visitor";
  if (message.role === "agent") return message.agentName ?? "Agent";
  return workspaceName;
}

export function LiveChatPage(): ReactElement {
  usePageTitle("Live chat");
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);

  const {
    data: sessions,
    loading,
    reload: loadSessions,
    setData: setSessions,
  } = useAsyncData(() => fetchChatSessions(), []);
  const sessionList = sessions ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatSessionDetail | null>(null);
  const [reply, setReply] = useState("");
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const seenKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadDetail = useCallback(async (sessionId: string) => {
    try {
      const data = await fetchChatSession(sessionId);
      setDetail(data);
      setDetailError(null);
      seenKeysRef.current.clear();
      for (const message of data.messages) {
        seenKeysRef.current.add(`${message.role}:${message.createdAt}:${message.body}`);
      }
      return data;
    } catch (err) {
      setDetail(null);
      setDetailError(apiErrorMessage(err, "Could not load this conversation."));
      return null;
    }
  }, []);

  useEffect(() => {
    if (isSocketIoEnabled()) return;
    const timer = window.setInterval(() => void loadSessions(), REMOTE_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadSessions]);

  useEffect(() => {
    if (isSocketIoEnabled() || !selectedId) return;
    const timer = window.setInterval(() => void loadDetail(selectedId), REMOTE_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  useEffect(() => {
    if (!token || !isSocketIoEnabled()) return;

    const socket = io("", {
      path: "/socket.io",
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("chat:workspace:join");
    });

    socket.on("chat:session:new", (session: ChatSessionSummary) => {
      setSessions((prev) => {
        const list = prev ?? [];
        if (list.some((s) => s.id === session.id)) return list;
        return [session, ...list];
      });
    });

    socket.on("chat:session:update", (session: ChatSessionSummary) => {
      setSessions((prev) => {
        const list = prev ?? [];
        const next = list.map((s) => (s.id === session.id ? { ...s, ...session } : s));
        if (session.status !== "active") {
          return next.filter((s) => s.id !== session.id);
        }
        return next;
      });
      if (selectedIdRef.current === session.id && session.status !== "active") {
        setSelectedId(null);
        setDetail(null);
      }
    });

    socket.on("chat:message", (payload: { sessionId: string; message: ChatMessage }) => {
      if (payload.sessionId !== selectedIdRef.current) return;
      const key = `${payload.message.role}:${payload.message.createdAt}:${payload.message.body}`;
      if (seenKeysRef.current.has(key)) return;
      seenKeysRef.current.add(key);
      setVisitorTyping(false);
      setDetail((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...prev.messages, payload.message] };
      });
    });

    socket.on("chat:typing", (payload: { sessionId: string; role: string; typing: boolean }) => {
      if (payload.sessionId !== selectedIdRef.current) return;
      if (payload.role === "visitor") setVisitorTyping(payload.typing);
    });

    return () => {
      socket.emit("chat:workspace:leave");
      socket.disconnect();
    };
  }, [token, setSessions]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedId) return;

    socket.emit("chat:session:join", { sessionId: selectedId });
    return () => {
      socket.emit("chat:session:leave", { sessionId: selectedId });
    };
  }, [selectedId]);

  const handleSelect = (sessionId: string) => {
    setSelectedId(sessionId);
    setReply("");
    setVisitorTyping(false);
    setDetailError(null);
    setActionError(null);
    void loadDetail(sessionId);
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setDetail(null);
    setReply("");
    setVisitorTyping(false);
  };

  const emitAgentTyping = (typing: boolean) => {
    if (!selectedId) return;
    socketRef.current?.emit("chat:typing", { sessionId: selectedId, typing });
  };

  const handleClaim = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await claimChatSession(selectedId);
      await loadDetail(selectedId);
      await loadSessions();
      const key = `${result.joinMessage.role}:${result.joinMessage.createdAt}:${result.joinMessage.body}`;
      seenKeysRef.current.add(key);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not join this chat."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    const text = reply.trim();
    setReply("");
    setSending(true);
    setActionError(null);
    try {
      const result = await replyChatSession(selectedId, text);
      await loadDetail(selectedId);
      const key = `${result.message.role}:${result.message.createdAt}:${result.message.body}`;
      if (!seenKeysRef.current.has(key)) {
        seenKeysRef.current.add(key);
        setDetail((prev) =>
          prev ? { ...prev, messages: [...prev.messages, result.message] } : prev,
        );
      }
      await loadSessions();
    } catch (err) {
      setReply(text);
      setActionError(apiErrorMessage(err, "Could not send reply."));
    } finally {
      setSending(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await convertChatSession(selectedId);
      await loadSessions();
      setSelectedId(null);
      setDetail(null);
      if (!result.alreadyConverted) {
        window.location.href = `/tickets/${result.ticketId}`;
      }
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not convert chat to ticket."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await closeChatSession(selectedId);
      await loadSessions();
      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not end chat."));
    } finally {
      setActionLoading(false);
    }
  };

  const isAssignedToMe = detail?.assignedAgent?.id === user?.id;
  const isUnassigned = detail && !detail.assignedAgent;
  const isActive = detail?.status === "active";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Real-time"
        title="Live chat"
        description="Answer website visitors in real time. Unassigned chats get an automatic bot reply until you join."
      />

      <div className="vw-chat-workspace">
        <aside
          className={`min-h-0 border-b border-vw-border md:border-b-0 md:border-r ${selectedId ? "hidden md:block" : "block"}`}
        >
          <div className="border-b border-vw-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">
              Active chats
            </p>
            <p className="mt-1 text-sm text-vw-fg-soft">
              {loading ? "Loading…" : `${sessionList.length} waiting`}
            </p>
          </div>
          <ul className="max-h-[min(28rem,calc(100dvh-18rem))] overflow-y-auto md:max-h-none md:min-h-[24rem] lg:min-h-[28rem]">
            {sessionList.length === 0 && !loading ? (
              <li className="px-4 py-4">
                <EmptyState
                  compact
                  icon="chat"
                  title="No active chats"
                  description="Visitors will appear here when they message your widget."
                />
              </li>
            ) : null}
            {sessionList.map((session) => {
              const active = session.id === selectedId;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(session.id)}
                    className={`w-full border-b border-vw-border px-4 py-3 text-left transition-colors duration-vw ease-out-expo ${
                      active
                        ? "border-l-2 border-l-vw-accent bg-vw-navActive"
                        : "hover:bg-vw-elevated/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-vw-headline">{visitorLabel(session)}</span>
                      <span className="shrink-0 text-[0.65rem] text-vw-muted">
                        {formatTime(session.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-vw-muted">
                      {session.lastMessage?.body ?? "New conversation"}
                    </p>
                    {session.assignedAgent ? (
                      <p className="mt-2 text-[0.65rem] text-vw-accent">
                        {session.assignedAgent.name ?? session.assignedAgent.email}
                      </p>
                    ) : (
                      <p className="mt-2 text-[0.65rem] text-vw-warning">Unassigned</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section
          className={`flex min-h-0 flex-col md:min-h-[24rem] lg:min-h-[28rem] ${selectedId ? "flex" : "hidden md:flex"}`}
        >
          {!detail ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6">
              {detailError ? (
                <div className="max-w-md text-center">
                  <p className="text-sm text-vw-danger">{detailError}</p>
                  <button
                    type="button"
                    className="vw-btn-secondary mt-4 text-sm"
                    onClick={handleBackToList}
                  >
                    Back to chat list
                  </button>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon="chat"
                  title="Select a conversation"
                  description="Choose a chat from the list to view messages and reply."
                />
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vw-border px-4 py-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-vw-accent md:hidden"
                    onClick={handleBackToList}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    All chats
                  </button>
                  <h2 className="truncate font-semibold text-vw-headline">{visitorLabel(detail)}</h2>
                  <p className="truncate text-xs text-vw-muted">
                    {detail.visitorEmail ?? "No email provided"}
                    {detail.assignedAgent
                      ? ` · ${detail.assignedAgent.name ?? detail.assignedAgent.email}`
                      : " · Unassigned"}
                  </p>
                </div>
                <div className="vw-list-row-actions">
                  {isActive && isUnassigned ? (
                    <button
                      type="button"
                      className="vw-btn-primary w-full text-sm sm:w-auto"
                      disabled={actionLoading}
                      onClick={() => void handleClaim()}
                    >
                      Join chat
                    </button>
                  ) : null}
                  {isActive ? (
                    <>
                      <button
                        type="button"
                        className="vw-btn-secondary w-full text-sm sm:w-auto"
                        disabled={actionLoading}
                        onClick={() => void handleConvert()}
                      >
                        Convert to ticket
                      </button>
                      <button
                        type="button"
                        className="vw-btn-secondary w-full text-sm sm:w-auto"
                        disabled={actionLoading}
                        onClick={() => void handleClose()}
                      >
                        End chat
                      </button>
                    </>
                  ) : detail.ticketId ? (
                    <Link to={`/tickets/${detail.ticketId}`} className="vw-btn-secondary w-full text-sm sm:w-auto">
                      View ticket
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                {detail.messages.map((message) => {
                  const isVisitor = message.role === "visitor";
                  const isAgent = message.role === "agent";
                  return (
                    <div
                      key={`${message.createdAt}-${message.body}`}
                      className={`flex ${isVisitor ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] ${
                          isVisitor
                            ? "vw-chat-bubble-visitor"
                            : isAgent
                              ? "vw-chat-bubble-agent"
                              : "vw-chat-bubble-system"
                        }`}
                      >
                        <p className="mb-1 text-[0.65rem] font-medium opacity-80">
                          {messageAuthor(message, workspace?.name ?? "Support")} ·{" "}
                          {formatTime(message.createdAt)}
                        </p>
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        {message.attachments?.map((file) =>
                          file.mimeType.startsWith("image/") ? (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block"
                            >
                              <img
                                src={file.url}
                                alt={file.name}
                                className="max-h-40 max-w-full rounded-lg border border-vw-border"
                              />
                            </a>
                          ) : null,
                        )}
                      </div>
                    </div>
                  );
                })}
                {visitorTyping ? (
                  <p className="text-xs text-vw-muted">Visitor is typing…</p>
                ) : null}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {actionError ? (
                <p className="border-t border-vw-border px-4 py-2 text-sm text-vw-danger">{actionError}</p>
              ) : null}

              {isActive ? (
                <div className="border-t border-vw-border p-4">
                  {isUnassigned ? (
                    <p className="mb-3 text-sm text-vw-muted">
                      Join this chat to reply. Until then, the visitor only sees automatic responses.
                    </p>
                  ) : !isAssignedToMe ? (
                    <p className="mb-3 text-sm text-vw-warning">
                      This chat is assigned to{" "}
                      {detail.assignedAgent?.name ?? detail.assignedAgent?.email}.
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <textarea
                      className="vw-input min-h-[2.75rem] w-full flex-1 resize-none !mt-0"
                      rows={2}
                      placeholder={
                        isUnassigned
                          ? "Type your reply to join and respond…"
                          : isAssignedToMe
                            ? "Type your reply…"
                            : "Assigned to another agent"
                      }
                      value={reply}
                      disabled={!isAssignedToMe && !isUnassigned}
                      onChange={(e) => {
                        setReply(e.target.value);
                        emitAgentTyping(e.target.value.trim().length > 0);
                      }}
                      onBlur={() => emitAgentTyping(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="vw-btn-primary w-full shrink-0 sm:w-auto sm:self-end"
                      disabled={sending || !reply.trim() || (!isAssignedToMe && !isUnassigned)}
                      onClick={() => void handleSend()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-vw-border px-4 py-6 text-center text-sm text-vw-muted">
                  This chat has ended.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
