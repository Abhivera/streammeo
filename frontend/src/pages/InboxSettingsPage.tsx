import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { api, fetchInboxes } from "../api/client";
import type { Inbox } from "../types";

export function InboxSettingsPage(): ReactElement {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    void fetchInboxes().then(setInboxes);
  };

  useEffect(load, []);

  async function createInbox(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post("/api/v1/inboxes", { name, email });
      setName("");
      setEmail("");
      setMessage("Inbox created");
      load();
    } catch {
      setMessage("Failed to create inbox");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-vw-headline">Shared inboxes</h1>
        <p className="mt-1 text-sm text-vw-muted">
          Route inbound email to tickets. Point Brevo webhooks to{" "}
          <code className="text-vw-fg-soft">/api/v1/webhooks/email/inbound</code>{" "}
          (local Fastify or AWS Lambda URL from CDK <code className="text-vw-fg-soft">WebhookApiUrl</code>).
        </p>
      </div>

      <div className="vw-panel divide-y divide-vw-border-faint">
        {inboxes.map((inbox) => (
          <div key={inbox.id} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-vw-headline">{inbox.name}</p>
              <p className="text-sm text-vw-muted">{inbox.email}</p>
            </div>
            <div className="text-xs text-vw-muted">
              {inbox.isDefault ? "Default inbox" : "Secondary"}
              {inbox.autoResponderEnabled ? " · Auto-responder on" : ""}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => void createInbox(e)} className="vw-panel space-y-4 p-6">
        <h2 className="text-lg font-medium text-vw-headline">Add inbox</h2>
        <label className="vw-field-label">
          Name
          <input className="vw-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="vw-field-label">
          Email address
          <input
            className="vw-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {message ? <p className="text-sm text-vw-success">{message}</p> : null}
        <button type="submit" className="vw-btn-primary">
          Create inbox
        </button>
      </form>
    </div>
  );
}
