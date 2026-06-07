import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

type PortalTicket = {
  number: number;
  subject: string;
  status: string;
  comments: Array<{ id: string; body: string; createdAt: string; authorName: string }>;
};

export function PortalTicketPage(): ReactElement {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<PortalTicket | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const baseURL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    if (!token) return;
    axios
      .get<PortalTicket>(`${baseURL}/api/v1/portal/ticket/${token}`)
      .then((res) => setTicket(res.data))
      .catch(() => setError("This link is invalid or has expired."));
  }, [token, baseURL]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !message.trim()) return;
    await axios.post(`${baseURL}/api/v1/portal/ticket/${token}/reply`, {
      message: message.trim(),
    });
    setMessage("");
    setSent(true);
    const res = await axios.get<PortalTicket>(`${baseURL}/api/v1/portal/ticket/${token}`);
    setTicket(res.data);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
        <p className="text-vw-danger">{error}</p>
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
          <p className="text-sm text-vw-muted">Support ticket</p>
          <h1 className="mt-1 text-2xl font-semibold text-vw-headline">
            #{ticket.number} · {ticket.subject}
          </h1>
          <p className="mt-2 text-sm capitalize text-vw-muted">Status: {ticket.status}</p>
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
          </form>
        ) : (
          <p className="text-sm text-vw-muted">This ticket is closed.</p>
        )}
      </div>
    </div>
  );
}
