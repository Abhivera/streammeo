import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SessionRow } from "../types";

interface Analytics {
  totalCalls: number;
  resolvedCalls: number;
  callsToday: number;
  callsThisWeek: number;
  avgDurationSec: number;
  resolutionRate: number;
  topQuestions: { text: string; count: number }[];
  minutesUsed: number;
  minutesLimit: number;
}

export function DashboardPage(): ReactElement {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [{ data: a }, { data: rows }] = await Promise.all([
          api.get<Analytics>("/workspace/analytics"),
          api.get<{ data: SessionRow[] }>("/workspace/sessions?limit=5"),
        ]);
        setAnalytics(a);
        setSessions(rows.data);
      } catch {
        setError("Could not load dashboard");
      }
    }
    void load();
  }, []);

  if (error)
    return <div className="rounded-lg border border-rose-500/40 p-4 text-rose-200">{error}</div>;
  if (!analytics) return <div className="text-slate-400">Loading…</div>;

  const usagePct =
    analytics.minutesLimit > 0
      ? Math.min(100, Math.round((analytics.minutesUsed / analytics.minutesLimit) * 100))
      : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-slate-400">
          Conversations routed through Sarvam + Claude with live widget audio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Calls today" value={analytics.callsToday.toString()} />
        <Stat label="Calls this week" value={analytics.callsThisWeek.toString()} />
        <Stat label="Total calls" value={analytics.totalCalls.toString()} />
        <Stat
          label="Resolution rate"
          value={`${analytics.resolutionRate}%`}
          sub={`${analytics.resolvedCalls} resolved`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-slate-500">Minutes</h2>
          <div className="mb-2 flex justify-between text-sm text-slate-300">
            <span>
              {analytics.minutesUsed} / {analytics.minutesLimit}
            </span>
            <span>{usagePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-violet-500 transition-[width]"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <Link
            to="/settings/billing"
            className="mt-3 inline-block text-sm text-violet-300 hover:underline"
          >
            Billing & upgrades
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-slate-500">Top questions</h2>
          <ol className="space-y-2 text-sm text-slate-200">
            {analytics.topQuestions.length === 0 ? (
              <li className="text-slate-500">No transcripts yet.</li>
            ) : (
              analytics.topQuestions.map((q, i) => (
                <li key={q.text} className="flex justify-between gap-3">
                  <span className="line-clamp-2">
                    {i + 1}. {q.text}
                  </span>
                  <span className="shrink-0 text-slate-500">{q.count}×</span>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 className="text-lg font-semibold text-white">Recent sessions</h2>
          <Link to="/sessions" className="text-sm text-violet-300 hover:underline">
            View all
          </Link>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-800 px-5 py-2">Started</th>
              <th className="border-b border-slate-800 px-5 py-2">Messages</th>
              <th className="border-b border-slate-800 px-5 py-2">Resolved</th>
              <th className="border-b border-slate-800 px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/50">
                <td className="border-b border-slate-900 px-5 py-2 text-slate-300">
                  {new Date(s.startedAt).toLocaleString()}
                </td>
                <td className="border-b border-slate-900 px-5 py-2 text-slate-300">
                  {s.messageCount}
                </td>
                <td className="border-b border-slate-900 px-5 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.resolved ? "bg-emerald-900/70 text-emerald-200" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {s.resolved ? "Resolved" : "Open"}
                  </span>
                </td>
                <td className="border-b border-slate-900 px-5 py-2 text-right">
                  <Link to={`/sessions/${s.id}`} className="text-violet-300 hover:underline">
                    Open
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

function Stat(props: Readonly<{ label: string; value: string; sub?: string }>): ReactElement {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{props.value}</div>
      {props.sub ? <div className="text-xs text-slate-400">{props.sub}</div> : null}
    </div>
  );
}
