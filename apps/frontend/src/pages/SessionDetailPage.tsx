import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { SessionDetail } from "../types";

export function SessionDetailPage(): ReactElement {
  const { id } = useParams();
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!(id && id.length)) return;
      const { data } = await api.get<SessionDetail>(`/workspace/sessions/${id}`);
      setSession(data);
    }
    void load();
  }, [id]);

  if (!session)
    return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/sessions" className="text-xs text-violet-300 hover:underline">
            ← All sessions
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">Session transcript</h1>
          <p className="text-sm text-slate-400">{new Date(session.startedAt).toLocaleString()}</p>
        </div>
        <span
          className={`mt-10 rounded-full px-3 py-1 text-xs ${
            session.resolved ? "bg-emerald-900/70 text-emerald-200" : "bg-slate-800 text-slate-400"
          }`}
        >
          {session.resolved ? "Resolved" : "Open"}
        </span>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Conversation</h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-100">
          {session.transcript.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 ${
                m.role === "assistant" ? "bg-slate-800/70" : "bg-violet-900/35"
              }`}
            >
              <span className="text-xs uppercase text-slate-500">{m.role}</span>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Tool calls</h2>
        {session.toolCalls.length === 0 ? (
          <p className="text-sm text-slate-500">No tools used.</p>
        ) : (
          <ul className="space-y-2 text-xs text-slate-300">
            {session.toolCalls.map((tc) => (
              <li key={tc.id} className="rounded-lg border border-slate-800 p-2 font-mono">
                <span className="text-violet-300">{tc.toolName}</span>
                <pre className="mt-1 whitespace-pre-wrap text-[11px] text-slate-400">
                  {JSON.stringify(tc.input, null, 2)}
                  {" → "}
                  {JSON.stringify(tc.output, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
