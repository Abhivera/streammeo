import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { ChatIcon, SettingsIcon, TicketsIcon } from "../components/NavIcons";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchAnalytics } from "../api/client";
import { formatRelativeTime } from "../lib/formatTime";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-vw-danger",
  high: "bg-vw-warning",
  normal: "bg-vw-accent",
  low: "bg-vw-muted",
};

const QUICK_LINKS = [
  { to: "/tickets", label: "Ticket queue", hint: "Review and assign open tickets", icon: TicketsIcon },
  { to: "/live-chat", label: "Live chat", hint: "Answer visitors in real time", icon: ChatIcon },
  { to: "/settings", label: "Settings", hint: "Team, inboxes, and SLA policies", icon: SettingsIcon },
] as const;

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "danger" | "success" | "warning";
}) {
  const accentBorder =
    accent === "danger"
      ? "border-l-vw-danger"
      : accent === "success"
        ? "border-l-vw-success"
        : accent === "warning"
          ? "border-l-vw-warning"
          : "border-l-vw-accent/50";

  return (
    <div className={`vw-stat-card border-l-2 ${accentBorder}`}>
      <p className="text-sm text-vw-muted">{label}</p>
      <p className="mt-2 font-brand text-3xl font-semibold tracking-tight text-vw-headline">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-vw-muted">{hint}</p> : null}
    </div>
  );
}

function DashboardSkeleton(): ReactElement {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="vw-skeleton h-8 w-48" />
        <div className="vw-skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="vw-skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vw-skeleton h-40 rounded-xl" />
        <div className="vw-skeleton h-40 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardPage(): ReactElement {
  usePageTitle("Dashboard");
  const { data, loading, error } = useAsyncData(() => fetchAnalytics(), []);

  if (error) {
    return (
      <div className="vw-panel border-l-2 border-l-vw-danger p-6 text-sm text-vw-danger">
        Failed to load analytics
      </div>
    );
  }

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const maxPriority = Math.max(...data.byPriority.map((r) => r.count), 1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live queue health, resolution metrics, CSAT scores, and your most recent tickets."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="vw-quick-link group">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-vw-border bg-vw-elevated text-vw-accent transition-colors group-hover:border-vw-accent/30 group-hover:bg-vw-accent-surface">
              <link.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-vw-headline">{link.label}</span>
              <span className="mt-0.5 block text-xs text-vw-muted">{link.hint}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Open tickets" value={data.openTickets} />
        <StatCard label="Created today" value={data.ticketsToday} />
        <StatCard label="This week" value={data.ticketsThisWeek} />
        <StatCard
          label="CSAT score"
          value={data.csatAvgScore ?? "—"}
          hint={data.csatResponses > 0 ? `${data.csatResponses} responses` : "No surveys yet"}
          accent="success"
        />
        <StatCard
          label="SLA breaches"
          value={data.slaBreaches}
          hint={data.slaBreaches > 0 ? "Needs attention" : "All on track"}
          accent={data.slaBreaches > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vw-panel p-5">
          <h2 className="text-lg font-medium text-vw-headline">Resolution rate</h2>
          <p className="mt-3 font-brand text-4xl font-semibold text-vw-success">
            {data.resolutionRate}%
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-vw-progress-track">
            <div
              className="vw-progress-fill"
              style={{ width: `${Math.min(data.resolutionRate, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-vw-muted">
            Avg resolution time: {data.avgResolutionHours}h
          </p>
        </div>

        <div className="vw-panel p-5">
          <h2 className="text-lg font-medium text-vw-headline">Open by priority</h2>
          <ul className="mt-5 space-y-3">
            {data.byPriority.map((row) => (
              <li key={row.priority}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="capitalize text-vw-fg-soft">{row.priority}</span>
                  <span className="font-medium text-vw-headline">{row.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-vw-progress-track">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${PRIORITY_COLORS[row.priority] ?? "bg-vw-accent"}`}
                    style={{ width: `${(row.count / maxPriority) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="vw-panel overflow-hidden">
        <div className="vw-panel-header">
          <h2 className="vw-panel-title">Recent tickets</h2>
          <Link
            to="/tickets"
            className="text-sm font-medium text-vw-accent transition-colors hover:text-vw-accent-hover"
          >
            View all
          </Link>
        </div>

        <ul className="divide-y divide-vw-border-faint md:hidden">
          {data.recentTickets.map((ticket) => (
            <li key={ticket.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-vw-muted">#{ticket.number}</span>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="mt-1 block break-words font-medium text-vw-fg transition-colors hover:text-vw-accent"
                  >
                    {ticket.subject}
                  </Link>
                  {ticket.slaBreached ? (
                    <span className="mt-2 inline-block rounded bg-vw-danger-soft px-1.5 py-0.5 text-xs text-vw-danger">
                      SLA breached
                    </span>
                  ) : null}
                </div>
                <StatusBadge status={ticket.status} className="shrink-0" />
              </div>
              <p
                className="mt-2 text-xs text-vw-muted"
                title={new Date(ticket.updatedAt).toLocaleString()}
              >
                {formatRelativeTime(ticket.updatedAt)}
              </p>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="vw-table-head">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTickets.map((ticket) => (
                <tr key={ticket.id} className="vw-table-row">
                  <td className="px-5 py-3.5 font-mono text-xs text-vw-muted">
                    #{ticket.number}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-medium text-vw-fg transition-colors hover:text-vw-accent"
                    >
                      {ticket.subject}
                    </Link>
                    {ticket.slaBreached ? (
                      <span className="ml-2 rounded bg-vw-danger-soft px-1.5 py-0.5 text-xs text-vw-danger">
                        SLA
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-5 py-3.5 text-vw-muted">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
