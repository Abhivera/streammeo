import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import {
  addTicketComment,
  fetchCannedResponses,
  fetchTicket,
  getTicketPortalLink,
  suggestAiReply,
  updateTicket,
} from "../api/client";
import type { CannedResponse } from "../types";
import { useAuthStore } from "../store/auth";
import type { PresenceUser, TicketDetail, TicketStatus } from "../types";

const STATUSES: TicketStatus[] = ["new", "open", "pending", "resolved", "closed"];

export function TicketDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeout = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await fetchTicket(id);
    setTicket(data);
  }, [id]);

  useEffect(() => {
    void load();
    fetchCannedResponses().then(setCanned).catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (!id || !token) return;

    const socket = io(import.meta.env.VITE_API_URL || "", {
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

  const emitTyping = (typing: boolean) => {
    if (!id) return;
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

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    await addTicketComment(id, reply.trim(), internalNote ? "internal" : "public");
    setReply("");
    emitTyping(false);
    await load();
  };

  if (!ticket) {
    return <p className="text-vw-muted">Loading ticket…</p>;
  }

  const otherViewers = presence.filter((p) => p.userId !== user?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/tickets" className="text-sm text-vw-accent hover:text-vw-accent-hover">
            ← Back to queue
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-vw-headline">
            #{ticket.number} · {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-vw-muted">
            {ticket.requesterName ?? ticket.requesterEmail} · {ticket.inbox?.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="vw-input py-2"
            value={ticket.status}
            onChange={(e) => void handleStatusChange(e.target.value as TicketStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {ticket.slaBreached ? (
            <span className="rounded bg-vw-danger-soft px-2 py-1 text-xs text-vw-danger">
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
              className={`vw-panel p-4 ${
                comment.visibility === "internal" ? "border-vw-warning-edge" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-vw-muted">
                <span>
                  {comment.author?.name ?? comment.author?.email ?? "Customer"}
                  {comment.visibility === "internal" ? " · Internal note" : ""}
                </span>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-vw-fg-soft">{comment.body}</p>
            </div>
          ))}

          <form onSubmit={(e) => void handleSubmitReply(e)} className="vw-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="vw-field-label" htmlFor="reply">
                Reply
              </label>
              <div className="flex flex-wrap gap-2">
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
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-vw-muted">
                <input
                  type="checkbox"
                  checked={internalNote}
                  onChange={(e) => setInternalNote(e.target.checked)}
                />
                Internal note only
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="vw-btn-secondary text-sm"
                  onClick={() => void handleCopyPortalLink()}
                >
                  Copy portal link
                </button>
                <button type="submit" className="vw-btn-primary">
                  Send
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="vw-panel p-4 text-sm">
            <h2 className="font-medium text-vw-headline">Details</h2>
            <dl className="mt-3 space-y-2 text-vw-fg-soft">
              <div className="flex justify-between">
                <dt className="text-vw-muted">Priority</dt>
                <dd className="capitalize">{ticket.priority}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-vw-muted">Assignee</dt>
                <dd>{ticket.assignee?.name ?? "Unassigned"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-vw-muted">Created</dt>
                <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
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
