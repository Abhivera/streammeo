import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SessionRow } from "../types";

export function SessionsPage(): ReactElement {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const { data } = await api.get<{ data: SessionRow[] }>("/workspace/sessions?limit=100");
        setSessions(data.data);
      } catch {
        setError("Could not load sessions");
      }
    }
    void load();
  }, []);

  if (error)
    return <div className="rounded-lg border border-rose-500/40 p-4 text-rose-200">{error}</div>;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sessions</h1>
        <p className="text-sm text-slate-400">Customer voice transcripts and tooling.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-800 px-4 py-2">Started</th>
              <th className="border-b border-slate-800 px-4 py-2">Duration</th>
              <th className="border-b border-slate-800 px-4 py-2">Messages</th>
              <th className="border-b border-slate-800 px-4 py-2">Resolved</th>
              <th className="border-b border-slate-800 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/60">
                <td className="border-b border-slate-900 px-4 py-2 text-slate-300">
                  {new Date(s.startedAt).toLocaleString()}
                </td>
                <td className="border-b border-slate-900 px-4 py-2 text-slate-300">
                  {s.durationSec}s
                </td>
                <td className="border-b border-slate-900 px-4 py-2 text-slate-300">
                  {s.messageCount}
                </td>
                <td className="border-b border-slate-900 px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.resolved ? "bg-emerald-900/70 text-emerald-200" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {s.resolved ? "Resolved" : "Open"}
                  </span>
                </td>
                <td className="border-b border-slate-900 px-4 py-2 text-right">
                  <Link className="text-violet-300 hover:underline" to={`/sessions/${s.id}`}>
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
