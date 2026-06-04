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

  if (error) {
    return (
      <div
        className="vw-panel max-w-xl border-vw-danger-edge bg-vw-surface p-4 text-sm text-vw-danger"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="mx-auto max-w-5xl space-y-8" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-vw-elevated" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-vw-elevated" />
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-14 flex-1 min-w-[5.5rem] max-w-[9rem] animate-pulse rounded-lg bg-vw-elevated" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
          <div className="h-40 animate-pulse rounded-xl bg-vw-elevated" />
          <div className="h-40 animate-pulse rounded-xl bg-vw-elevated" />
        </div>
        <div className="h-56 animate-pulse rounded-xl bg-vw-elevated" />
      </div>
    );
  }

  const stripItems = [
    { k: "Today", v: analytics.callsToday.toString() },
    { k: "This week", v: analytics.callsThisWeek.toString() },
    { k: "All time", v: analytics.totalCalls.toString() },
    {
      k: "Resolved",
      v: `${analytics.resolutionRate}%`,
      hint: `${analytics.resolvedCalls} marked`,
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header>
        <h1 className="vw-page-title">Overview</h1>
        <p className="vw-page-lede">
          Voice support at a glance: session volume, resolution, minutes, and the questions customers ask most often.
        </p>
      </header>

      <section
        className="vw-panel flex flex-wrap items-stretch divide-x divide-vw-border overflow-hidden p-1"
        aria-label="Support call summary"
      >
        {stripItems.map((item, i) => (
          <div
            key={item.k}
            className={`flex min-w-[6.5rem] flex-1 flex-col justify-center px-4 py-3 sm:px-5 ${i === 0 ? "sm:pl-5" : ""}`}
          >
            <span className="text-[0.7rem] font-medium uppercase tracking-wide text-vw-muted">{item.k}</span>
            <span className="mt-1 text-xl font-semibold tabular-nums text-vw-fg sm:text-2xl">{item.v}</span>
            {"hint" in item && item.hint ? (
              <span className="mt-0.5 text-xs text-vw-muted">{item.hint}</span>
            ) : null}
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,18.5rem)] lg:items-start">
        <section className="vw-panel p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-vw-headline">Voice minutes</h2>
              <p className="mt-1 max-w-md text-sm text-vw-muted">
                Total from session length (prototype: tracked for visibility; no checkout or plan tiers wired yet).
              </p>
            </div>
            <p className="text-right text-sm tabular-nums text-vw-fg">
              <span className="font-semibold text-vw-fg">{analytics.minutesUsed}</span>
              <span className="text-vw-muted"> min</span>
            </p>
          </div>
          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-vw-progress-track" aria-hidden>
            <div
              className="h-full min-h-0 rounded-full bg-vw-progress-fill transition-[width] duration-vw ease-out-expo"
              style={{
                width: `${analytics.minutesUsed <= 0 ? 0 : Math.min(100, Math.max(5, analytics.minutesUsed * 4))}%`,
              }}
            />
          </div>
        </section>

        <section className="vw-panel p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-vw-headline">Top questions</h2>
          <p className="mt-1 text-xs leading-relaxed text-vw-muted">What customers asked in recent transcripts (sample).</p>
          <ol className="mt-4 space-y-3 text-sm text-vw-fg">
            {analytics.topQuestions.length === 0 ? (
              <li className="rounded-lg bg-vw-keywell px-3 py-4 text-center text-vw-muted">No transcripts yet.</li>
            ) : (
              analytics.topQuestions.map((q, i) => (
                <li key={q.text} className="flex gap-3 border-b border-vw-border pb-3 last:border-0 last:pb-0">
                  <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-xs text-vw-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 leading-snug text-vw-fg">{q.text}</span>
                  <span className="shrink-0 tabular-nums text-vw-muted">{q.count}×</span>
                </li>
              ))
            )}
          </ol>
        </section>
      </div>

      <section className="vw-panel">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-vw-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-vw-headline">Recent sessions</h2>
            <p className="mt-0.5 text-xs text-vw-muted">Newest support conversations first, up to five.</p>
          </div>
          <Link
            to="/sessions"
            className="text-sm font-medium text-vw-accent transition-colors duration-vw ease-out-expo hover:text-vw-accent-hover"
          >
            All sessions
          </Link>
        </div>
        <table className="w-full min-w-0 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-vw-border">
                <th className="vw-table-head px-5 py-2.5 sm:px-6">Started</th>
                <th className="vw-table-head px-5 py-2.5 sm:px-6">Messages</th>
                <th className="vw-table-head px-5 py-2.5 sm:px-6">Resolved</th>
                <th className="vw-table-head px-5 py-2.5 sm:px-6" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-vw-border transition-colors duration-vw ease-out-expo hover:bg-vw-elevated-hover">
                  <td className="max-w-[10rem] break-words px-5 py-3 tabular-nums text-vw-fg sm:max-w-none sm:px-6">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-vw-fg sm:px-6">{s.messageCount}</td>
                  <td className="px-5 py-3 sm:px-6">
                    <span
                      className={
                        s.resolved
                          ? "inline-flex rounded-md bg-vw-success-soft px-2 py-0.5 text-xs font-medium text-vw-success-fg"
                          : "vw-badge-open py-0.5"
                      }
                    >
                      {s.resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right sm:px-6">
                    <Link
                      to={`/sessions/${s.id}`}
                      className="font-medium text-vw-accent transition-colors duration-vw ease-out-expo hover:text-vw-accent-hover"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </section>
    </div>
  );
}
