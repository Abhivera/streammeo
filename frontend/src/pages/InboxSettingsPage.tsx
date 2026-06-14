import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { api, fetchInboxes } from "../api/client";
import type { Inbox } from "../types";

export function InboxSettingsPage(): ReactElement {
  usePageTitle("Shared inboxes");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { data: inboxes, reload } = useAsyncData(() => fetchInboxes(), []);

  async function createInbox(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post("/api/v1/inboxes", { name, email });
      setName("");
      setEmail("");
      setMessage("Inbox created");
      reload();
    } catch {
      setMessage("Failed to create inbox");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shared inboxes"
        description="Connect team email addresses to Streammeo. Inbound messages become tickets automatically when Brevo webhooks point to your inbound endpoint."
      />

      <div className="vw-panel space-y-3 p-5">
        <h2 className="text-sm font-medium text-vw-headline">Webhook setup</h2>
        <p className="text-sm text-vw-muted">
          Point Brevo inbound webhooks to{" "}
          <code className="text-vw-fg-soft">/api/v1/webhooks/email/inbound</code> on your API host
          (local Fastify during dev, or the{" "}
          <code className="text-vw-fg-soft">WebhookApiUrl</code> output from CDK in production).
        </p>
      </div>

      <div className="vw-panel divide-y divide-vw-border-faint">
        {(inboxes ?? []).map((inbox: Inbox) => (
          <div
            key={inbox.id}
            className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
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
