import type { FormEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Workspace } from "../types";

const PREVIEW_EN = "Hi, I'm {agent}. How can I help you today?";

export function SettingsPage(): ReactElement {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const { data } = await api.get<Workspace>("/workspace");
      setWs(data);
      setName(data.name);
      setAgentName(data.agentName);
      setSystemPrompt(data.systemPrompt);
    }
    void load();
  }, []);

  const preview = useMemo(
    () => PREVIEW_EN.replace("{agent}", agentName || ws?.agentName || "Alex"),
    [agentName, ws?.agentName],
  );

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await api.patch("/workspace", {
      name,
      agentName,
      language: "en",
      systemPrompt,
    });
    setToast("Saved");
    window.setTimeout(() => setToast(null), 2200);
  }

  const embedSnippet =
    ws?.apiKey !== undefined && ws.apiKey.length > 0
      ? `<script src="…/widget.js" data-api-key="${ws.apiKey}" data-backend-url="…"></script>`
      : "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <header>
        <h1 className="vw-page-title">Workspace</h1>
        <p className="vw-page-lede">
          How your support agent introduces itself and behaves on every voice call. Speech is English; tune tone and
          boundaries in the system prompt.
        </p>
      </header>

      {ws?.apiKey ? (
        <section className="vw-panel space-y-3 p-5 text-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-vw-muted">Embed key</h2>
            <p className="mt-2 font-mono text-sm text-vw-fg-soft break-all">{ws.apiKey}</p>
          </div>
          <p className="text-xs leading-relaxed text-vw-muted">Paste on your site as:</p>
          <pre className="overflow-x-auto rounded-lg border border-vw-border bg-vw-bg p-3 text-xs leading-relaxed text-vw-fg-soft">
            {embedSnippet}
          </pre>
        </section>
      ) : null}

      <form onSubmit={submit} className="vw-panel space-y-6 p-6 sm:p-8">
        <label className="vw-field-label">
          Workspace name
          <input
            required
            className="vw-input"
            value={name}
            onChange={(evt) => setName(evt.target.value)}
          />
        </label>
        <label className="vw-field-label">
          Agent display name
          <input
            required
            className="vw-input"
            value={agentName}
            onChange={(evt) => setAgentName(evt.target.value)}
          />
        </label>
        <p className="text-xs leading-relaxed text-vw-muted">
          Voice recognition and spoken replies use <span className="font-medium text-vw-fg-soft">English</span>{" "}
          (Deepgram STT / TTS).
        </p>
        <label className="vw-field-label">
          System prompt ({systemPrompt.length} characters)
          <textarea
            required
            value={systemPrompt}
            rows={6}
            onChange={(evt) => setSystemPrompt(evt.target.value)}
            className="vw-input font-mono text-xs leading-relaxed"
          />
        </label>
        <section className="rounded-lg border border-vw-border bg-vw-bg px-4 py-3 text-xs leading-relaxed text-vw-fg-soft">
          <span className="font-medium text-vw-muted">Greeting preview: </span>
          {preview}
        </section>
        <button type="submit" className="vw-btn-primary">
          Save workspace
        </button>
      </form>
      {toast ? <div className="vw-toast">{toast}</div> : null}
    </div>
  );
}
