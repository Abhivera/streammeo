import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SessionRow } from "../types";

export function SessionsPage(): ReactElement {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
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

  if (error) {
    return (
      <div className="vw-panel max-w-xl border-vw-danger-edge p-4 text-sm text-vw-danger" role="alert">
        {error}
      </div>
    );
  }

  if (sessions === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-6" aria-busy="true" aria-label="Loading sessions">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-vw-elevated" />
        <div className="h-4 w-64 animate-pulse rounded bg-vw-elevated" />
        <div className="h-72 animate-pulse rounded-xl bg-vw-elevated" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="vw-page-title">Sessions</h1>
        <p className="vw-page-lede">Support transcripts and tool usage from the voice widget (deflection and follow-up).</p>
      </header>
      <div className="vw-panel">
        <table className="w-full min-w-0 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-vw-border">
                <th className="vw-table-head px-4 py-3 sm:px-5">Started</th>
                <th className="vw-table-head px-4 py-3 sm:px-5">Duration</th>
                <th className="vw-table-head px-4 py-3 sm:px-5">Messages</th>
                <th className="vw-table-head px-4 py-3 sm:px-5">Resolved</th>
                <th className="vw-table-head px-4 py-3 sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-vw-muted sm:px-5">
                    No sessions yet. When customers use voice support, rows appear here.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-vw-border transition-colors duration-vw ease-out-expo hover:bg-vw-elevated-hover"
                  >
                    <td className="max-w-[10rem] break-words px-4 py-3 tabular-nums text-vw-fg sm:max-w-none sm:px-5">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-vw-fg sm:px-5">{s.durationSec}s</td>
                    <td className="px-4 py-3 tabular-nums text-vw-fg sm:px-5">{s.messageCount}</td>
                    <td className="px-4 py-3 sm:px-5">
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
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Link
                        className="font-medium text-vw-accent transition-colors duration-vw ease-out-expo hover:text-vw-accent-hover"
                        to={`/sessions/${s.id}`}
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
