import type { FormEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Workspace } from "../types";

const PREVIEW_TM =
  "Vanakkam! Naan {agent}. Ungalukku epadi udavi seiyalaam?"; /* Tamil onboarding line */

export function SettingsPage(): ReactElement {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [language, setLanguage] = useState<string>("ta");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      const { data } = await api.get<Workspace>("/workspace");
      setWs(data);
      setName(data.name);
      setAgentName(data.agentName);
      setLanguage(data.language);
      setSystemPrompt(data.systemPrompt);
    }
    void load();
  }, []);

  const preview = useMemo(
    () => PREVIEW_TM.replace("{agent}", agentName || ws?.agentName || "Priya"),
    [agentName, ws?.agentName],
  );

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await api.patch("/workspace", {
      name,
      agentName,
      language,
      systemPrompt,
    });
    setToast("Saved!");
    window.setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Workspace</h1>
        <p className="text-sm text-slate-400">Tune how VoiceWidget responds on your storefront.</p>
      </div>

      {ws?.apiKey ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Embed key</span>{" "}
          <span className="font-mono text-violet-200">{ws.apiKey}</span>
          <span className="mt-2 block text-slate-500">
            Use with{" "}
            <code className="text-slate-300">
              &lt;script src="…widget.js" data-api-key="{ws.apiKey}" data-backend-url="…"&gt;
            </code>
          </span>
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm text-slate-200">
          Store name
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={name}
            onChange={(evt) => setName(evt.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-200">
          Agent display name
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={agentName}
            onChange={(evt) => setAgentName(evt.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-200">
          Language for STT/TTS
          <select
            value={language}
            onChange={(evt) => setLanguage(evt.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="ta">Tamil</option>
            <option value="hi">Hindi</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="block text-sm text-slate-200">
          System prompt ({systemPrompt.length} chars)
          <textarea
            required
            value={systemPrompt}
            rows={6}
            onChange={(evt) => setSystemPrompt(evt.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
          />
        </label>
        <section className="rounded-lg bg-slate-950/70 p-3 text-xs text-slate-300 ring-1 ring-slate-800">
          Live preview Tamil phrase:{' '}
          <span className="text-violet-200">{preview}</span>
        </section>
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Save workspace
        </button>
      </form>
      {toast ? (
        <div className="fixed bottom-10 right-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm shadow-lg shadow-emerald-900/60">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
