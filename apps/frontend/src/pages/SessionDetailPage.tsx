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

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Loading session">
        <div className="h-4 w-28 animate-pulse rounded bg-vw-elevated" />
        <div className="h-9 w-56 animate-pulse rounded-lg bg-vw-elevated" />
        <div className="h-48 animate-pulse rounded-xl bg-vw-elevated" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/sessions"
            className="text-xs font-medium text-vw-accent transition-colors duration-vw ease-out-expo hover:text-vw-accent-hover"
          >
            ← All sessions
          </Link>
          <h1 className="mt-2 vw-page-title">Support session</h1>
          <p className="mt-1 text-sm text-vw-fg">Full transcript and tools for QA and follow-up.</p>
          <p className="mt-1 text-sm tabular-nums text-vw-muted">{new Date(session.startedAt).toLocaleString()}</p>
        </div>
        <span
          className={
            session.resolved
              ? "rounded-md bg-vw-success-soft px-3 py-1 text-xs font-medium text-vw-success-fg"
              : "inline-flex rounded-md bg-vw-badge-open-bg px-3 py-1 text-xs font-medium text-vw-badge-open-text"
          }
        >
          {session.resolved ? "Resolved" : "Open"}
        </span>
      </div>

      <section className="vw-panel space-y-4 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-vw-headline">Conversation</h2>
        <div className="space-y-3">
          {session.transcript.map((m) => (
            <article
              key={m.id}
              className={`rounded-lg border px-3.5 py-3 text-sm leading-relaxed ${
                m.role === "assistant"
                  ? "border-vw-border bg-vw-keywell text-vw-fg"
                  : "border-vw-accent-edge bg-vw-elevated text-vw-fg"
              }`}
            >
              <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-vw-muted">{m.role}</div>
              <p className="text-[0.9375rem] leading-relaxed">{m.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vw-panel space-y-3 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-vw-headline">Tool calls</h2>
        {session.toolCalls.length === 0 ? (
          <p className="text-sm text-vw-muted">No tools used in this session.</p>
        ) : (
          <ul className="space-y-2">
            {session.toolCalls.map((tc) => (
              <li key={tc.id} className="rounded-lg border border-vw-border bg-vw-keywell p-3 font-mono text-xs text-vw-fg">
                <span className="font-sans text-sm font-semibold text-vw-accent">{tc.toolName}</span>
                <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-vw-muted">
                  {JSON.stringify(tc.input, null, 2)}
                  {"\n→\n"}
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
