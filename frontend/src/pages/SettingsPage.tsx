import type { FormEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Workspace } from "../types";

const PREVIEW_EN = "Hi, I'm {agent}. How can I help you today?";

/** Clipboard API needs a secure context; fall back for HTTP (e.g. LAN IP) and older browsers. */
function copyTextViaExecCommand(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "0";
  ta.style.top = "0";
  ta.style.opacity = "0";
  ta.style.pointerEvents = "none";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  return ok;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (text.length === 0) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand
  }
  return copyTextViaExecCommand(text);
}

export function SettingsPage(): ReactElement {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);

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

  const backendUrlForEmbed = import.meta.env.VITE_API_URL?.trim() ?? "";

  const embedSnippet = useMemo(() => {
    if (ws?.apiKey === undefined || ws.apiKey.length === 0) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const scriptSrc = origin ? `${origin}/widget.js` : "/widget.js";
    const backendAttr =
      backendUrlForEmbed.length > 0 ? ` data-backend-url="${backendUrlForEmbed}"` : "";
    return `<script src="${scriptSrc}" data-api-key="${ws.apiKey}"${backendAttr}></script>`;
  }, [ws?.apiKey, backendUrlForEmbed]);

  const copyToClipboard = useCallback(async (kind: "key" | "snippet", text: string): Promise<void> => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } else {
      setToast("Could not copy — try selecting the text manually.");
      window.setTimeout(() => setToast(null), 2800);
    }
  }, []);

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
        <section className="space-y-4 rounded-xl border border-vw-accent/30 bg-vw-keywell p-5 shadow-vw ring-1 ring-vw-accent/15 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-vw-headline">Embed key</h2>
              <p className="mt-1.5 text-sm leading-snug text-vw-fg">
                Authenticates the widget on your site. Keep it secret — treat it like a password.
              </p>
            </div>
            <button
              type="button"
              className="vw-btn-secondary mt-2 shrink-0 self-start text-xs sm:mt-0"
              onClick={() => void copyToClipboard("key", ws.apiKey)}
            >
              {copied === "key" ? "Copied" : "Copy key"}
            </button>
          </div>
          <div className="rounded-lg border border-vw-border bg-vw-keywell px-3 py-3 font-mono text-[0.8125rem] leading-relaxed tracking-wide text-vw-fg break-all ring-1 ring-vw-accent/12">
            {ws.apiKey}
          </div>
          <div>
            <p className="text-xs font-medium text-vw-muted">Paste on your site as</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded-lg border border-vw-border bg-vw-keywell px-3 py-3 font-mono text-[0.7rem] leading-relaxed text-vw-fg ring-1 ring-vw-accent/10 sm:text-xs">
                {embedSnippet}
              </pre>
              <button
                type="button"
                className="vw-btn-secondary shrink-0 self-start px-3 py-2 text-xs sm:self-auto"
                onClick={() => void copyToClipboard("snippet", embedSnippet)}
              >
                {copied === "snippet" ? "Copied" : "Copy snippet"}
              </button>
            </div>
          </div>
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
          Voice recognition and spoken replies use <span className="font-medium text-vw-fg">English</span>{" "}
          (Amazon Transcribe + Amazon Polly).
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
        <section className="rounded-lg border border-vw-border bg-vw-keywell px-4 py-3 text-xs leading-relaxed text-vw-fg">
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
