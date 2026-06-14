import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { io, type Socket } from "socket.io-client";
import {
  addTicketComment,
  fetchCannedResponses,
  fetchTeamMembers,
  fetchTicket,
  getTicketPortalLink,
  suggestAiReply,
  updateTicket,
} from "../api/client";
import { isAppSyncConfigured, isSocketIoEnabled } from "../config";
import { subscribeToTicketEvents } from "../realtime/appsync";
import { useAuthStore } from "../store/auth";
import type { PresenceUser, TicketStatus } from "../types";

const STATUSES: TicketStatus[] = ["new", "open", "pending", "resolved", "closed"];
const REMOTE_REFRESH_MS = 30_000;

export function TicketDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const workspaceId = useAuthStore((s) => s.workspace?.id);
  const user = useAuthStore((s) => s.user);
  const {
    data: ticket,
    loading,
    reload: load,
    setData: setTicket,
  } = useAsyncData(
    () => {
      if (!id) throw new Error("Missing ticket id");
      return fetchTicket(id);
    },
    [id],
  );
  const { data: cannedData } = useAsyncData(() => fetchCannedResponses(), []);
  const canned = cannedData ?? [];
  const canManageAssignees = user?.role === "admin" || user?.role === "manager";
  const { data: teamData } = useAsyncData(
    () => (canManageAssignees ? fetchTeamMembers() : Promise.resolve(null)),
    [canManageAssignees],
  );
  const assignableMembers = teamData?.items ?? [];
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeout = useRef<number | null>(null);

  usePageTitle(ticket ? `Ticket #${ticket.number}` : "Ticket");

  useEffect(() => {
    if (!id || !token || !isSocketIoEnabled()) return;

    const socket = io("", {
      path: "/socket.io",
      auth: { token },
    });
    socketRef.current = socket;

    socket.emit("ticket:join", { ticketId: id });
    socket.on("ticket:presence", (users: PresenceUser[]) => setPresence(users));
    socket.on("ticket:typing", (payload: { email: string; typing: boolean }) => {
      setTypingUsers((prev) => {
        if (payload.typing) return [...new Set([...prev, payload.email])];
        return prev.filter((e) => e !== payload.email);
      });
    });

    return () => {
      socket.emit("ticket:leave", { ticketId: id });
      socket.disconnect();
    };
  }, [id, token]);

  useEffect(() => {
    if (!id || !workspaceId) return;

    if (isAppSyncConfigured()) {
      const unsubscribe = subscribeToTicketEvents(workspaceId, {
        onTicketEvent: (event) => {
          if (event.ticketId === id) void load();
        },
      });
      return () => unsubscribe?.();
    }

    if (!isSocketIoEnabled()) {
      const timer = window.setInterval(() => void load(), REMOTE_REFRESH_MS);
      return () => window.clearInterval(timer);
    }

    return undefined;
  }, [id, workspaceId, load]);

  const emitTyping = (typing: boolean) => {
    if (!id || !isSocketIoEnabled()) return;
    socketRef.current?.emit("ticket:typing", { ticketId: id, typing });
  };

  const onReplyChange = (value: string) => {
    setReply(value);
    emitTyping(true);
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => emitTyping(false), 1500);
  };

  const handleSuggestAi = async () => {
    if (!id) return;
    setAiLoading(true);
    try {
      const suggestion = await suggestAiReply(id);
      setReply(suggestion);
    } catch {
      alert("AI suggest unavailable on your plan or limit reached.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (!id) return;
    const url = portalLink ?? (await getTicketPortalLink(id));
    setPortalLink(url);
    await navigator.clipboard.writeText(url);
  };

  const applyCanned = (body: string) => {
    const customer = ticket?.requesterName ?? ticket?.requesterEmail ?? "Customer";
    setReply(
      body
        .replace(/\{\{customer_name\}\}/g, customer)
        .replace(/\{\{agent_name\}\}/g, user?.name ?? "Agent"),
    );
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!id) return;
    const updated = await updateTicket(id, { status });
    setTicket(updated);
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    if (!id) return;
    try {
      const updated = await updateTicket(id, { assigneeId });
      setTicket(updated);
    } catch {
      alert("Could not update assignee. Try again or pick another team member.");
    }
  };

  const handleAssignToMe = async () => {
    if (!user?.id) return;
    await handleAssigneeChange(user.id);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    await addTicketComment(id, reply.trim(), internalNote ? "internal" : "public");
    setReply("");
    emitTyping(false);
    load();
  };

  if (loading || !ticket) {
    return (
      <div className="space-y-6">
        <div className="vw-skeleton h-4 w-32" />
        <div className="vw-skeleton h-10 w-full max-w-xl" />
        <div className="vw-skeleton h-4 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="vw-skeleton h-32 rounded-xl" />
            <div className="vw-skeleton h-32 rounded-xl" />
          </div>
          <div className="vw-skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const otherViewers = presence.filter((p) => p.userId !== user?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1 text-sm text-vw-accent transition-colors hover:text-vw-accent-hover"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to queue
          </Link>
          <h1 className="mt-3 break-words text-xl font-semibold tracking-tight text-vw-headline sm:text-2xl">
            <span className="font-mono text-vw-muted">#{ticket.number}</span>
            <span className="text-vw-muted"> · </span>
            {ticket.subject}
          </h1>
          <p className="mt-1.5 break-words text-sm text-vw-muted">
            {ticket.requesterName ?? ticket.requesterEmail}
            {ticket.inbox?.email ? ` · ${ticket.inbox.email}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <select
            className="vw-select w-full py-2 text-sm sm:w-auto"
            value={ticket.status}
            onChange={(e) => void handleStatusChange(e.target.value as TicketStatus)}
            aria-label="Change ticket status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {ticket.slaBreached ? (
            <span className="rounded-full bg-vw-danger-soft px-2.5 py-1 text-xs font-medium text-vw-danger">
              SLA breached
            </span>
          ) : null}
        </div>
      </div>

      {(otherViewers.length > 0 || typingUsers.length > 0) && (
        <div className="rounded-lg border border-vw-warning-edge bg-vw-warning-soft px-4 py-3 text-sm text-vw-warning">
          {otherViewers.length > 0 ? (
            <span>
              Also viewing: {otherViewers.map((v) => v.name).join(", ")}
            </span>
          ) : null}
          {typingUsers.length > 0 ? (
            <span className={otherViewers.length > 0 ? " ml-2" : ""}>
              {typingUsers.join(", ")} typing…
            </span>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {ticket.comments.map((comment) => (
            <div
              key={comment.id}
              className={
                comment.visibility === "internal" ? "vw-comment-internal" : "vw-comment-public"
              }
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-vw-fg-soft">
                  {comment.author?.name ?? comment.author?.email ?? "Customer"}
                  {comment.visibility === "internal" ? (
                    <span className="ml-2 rounded bg-vw-warning-soft px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-vw-warning">
                      Internal
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-vw-muted">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-vw-fg-soft">
                {comment.body}
              </p>
            </div>
          ))}

          <form onSubmit={(e) => void handleSubmitReply(e)} className="vw-panel p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="vw-field-label shrink-0" htmlFor="reply">
                Reply
              </label>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                {canned.length > 0 ? (
                  <select
                    className="vw-input py-1 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      const item = canned.find((c) => c.id === e.target.value);
                      if (item) applyCanned(item.body);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Insert template…</option>
                    {canned.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  className="vw-btn-secondary py-1 text-xs"
                  disabled={aiLoading}
                  onClick={() => void handleSuggestAi()}
                >
                  {aiLoading ? "Drafting…" : "AI suggest"}
                </button>
              </div>
            </div>
            <textarea
              id="reply"
              rows={4}
              className="vw-input mt-2"
              value={reply}
              onChange={(e) => onReplyChange(e.target.value)}
              placeholder="Write your reply…"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-vw-muted">
                <input
                  type="checkbox"
                  className="vw-checkbox"
                  checked={internalNote}
                  onChange={(e) => setInternalNote(e.target.checked)}
                />
                Internal note only
              </label>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  className="vw-btn-secondary w-full text-sm sm:w-auto"
                  onClick={() => void handleCopyPortalLink()}
                >
                  Copy portal link
                </button>
                <button type="submit" className="vw-btn-primary w-full sm:w-auto">
                  Send
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="vw-panel p-4 text-sm">
            <h2 className="font-medium text-vw-headline">Details</h2>
            <dl className="mt-4 divide-y divide-vw-border-faint">
              <div className="flex justify-between py-2.5">
                <dt className="text-vw-muted">Priority</dt>
                <dd className="capitalize font-medium text-vw-fg-soft">{ticket.priority}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-vw-muted">Assignee</dt>
                <dd className="text-right text-vw-fg-soft">
                  {canManageAssignees ? (
                    <select
                      className="vw-select max-w-[12rem] py-1 text-sm"
                      value={ticket.assignee?.id ?? ""}
                      onChange={(e) =>
                        void handleAssigneeChange(e.target.value ? e.target.value : null)
                      }
                      aria-label="Assign ticket"
                    >
                      <option value="">Unassigned</option>
                      {assignableMembers.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.user.name ?? member.user.email}
                        </option>
                      ))}
                    </select>
                  ) : ticket.assignee?.id === user?.id ? (
                    ticket.assignee?.name ?? ticket.assignee?.email
                  ) : ticket.assignee ? (
                    ticket.assignee.name ?? ticket.assignee.email
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-medium text-vw-accent hover:text-vw-accent-hover"
                      onClick={() => void handleAssignToMe()}
                    >
                      Assign to me
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-vw-muted">Created</dt>
                <dd className="text-vw-fg-soft">
                  {new Date(ticket.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {ticket.slaPolicy ? (
            <div className="vw-panel p-4 text-sm">
              <h2 className="font-medium text-vw-headline">SLA · {ticket.slaPolicy.name}</h2>
              <p className="mt-2 text-vw-muted">
                First response: {ticket.slaPolicy.firstResponseMinutes} min
              </p>
              <p className="text-vw-muted">
                Resolution: {ticket.slaPolicy.resolutionMinutes} min
              </p>
            </div>
          ) : null}

          <div className="vw-panel p-4 text-sm">
            <h2 className="font-medium text-vw-headline">Timeline</h2>
            <ul className="mt-3 space-y-2">
              {ticket.events.map((event) => (
                <li key={event.id} className="text-vw-muted">
                  <span className="text-vw-fg-soft">{event.eventType}</span>
                  <span className="block text-xs">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
