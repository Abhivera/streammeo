import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPortalTicket, replyPortalTicket } from "../api/client";
import { usePageTitle } from "../hooks/usePageTitle";

export function PortalTicketPage(): ReactElement {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<Awaited<ReturnType<typeof fetchPortalTicket>> | null>(null);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  usePageTitle(ticket ? `Ticket #${ticket.number}` : "Support ticket");

  useEffect(() => {
    if (!token) return;
    fetchPortalTicket(token)
      .then(setTicket)
      .catch(() => setLoadError("This link is invalid or has expired."));
  }, [token]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !message.trim()) return;
    try {
      await replyPortalTicket(token, message.trim());
      setMessage("");
      setSent(true);
      setReplyError(null);
      const updated = await fetchPortalTicket(token);
      setTicket(updated);
    } catch {
      setReplyError("Could not send your reply. Please try again.");
      setSent(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
        <p className="text-vw-danger">{loadError}</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
        <p className="text-vw-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vw-bg px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm text-vw-muted">Customer support portal</p>
          <h1 className="mt-1 text-2xl font-semibold text-vw-headline">
            #{ticket.number} · {ticket.subject}
          </h1>
          <p className="mt-2 text-sm text-vw-muted">
            View your conversation and reply below. Resolved tickets reopen automatically when you
            send a message.
          </p>
          <p className="mt-1 text-sm capitalize text-vw-muted">Status: {ticket.status}</p>
        </header>

        <div className="space-y-4">
          {ticket.comments.map((c) => (
            <div key={c.id} className="vw-panel p-4">
              <div className="flex justify-between text-xs text-vw-muted">
                <span>{c.authorName}</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-vw-fg-soft">{c.body}</p>
            </div>
          ))}
        </div>

        {ticket.status !== "closed" ? (
          <form onSubmit={(e) => void handleReply(e)} className="vw-panel space-y-3 p-4">
            <label className="vw-field-label" htmlFor="portal-reply">
              Your reply
            </label>
            <textarea
              id="portal-reply"
              rows={4}
              className="vw-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" className="vw-btn-primary">
              Send reply
            </button>
            {sent ? <p className="text-sm text-vw-success">Reply sent.</p> : null}
            {replyError ? <p className="text-sm text-vw-danger">{replyError}</p> : null}
          </form>
        ) : (
          <p className="text-sm text-vw-muted">This ticket is closed.</p>
        )}

        <footer className="border-t border-vw-border pt-6 text-center text-sm text-vw-muted">
          <Link to="/help/track-your-request" className="text-vw-accent hover:text-vw-accent-hover">
            Help using this page
          </Link>
          <span className="mx-2">·</span>
          <Link to="/help" className="text-vw-accent hover:text-vw-accent-hover">
            Customer help center
          </Link>
        </footer>
      </div>
    </div>
  );
}
