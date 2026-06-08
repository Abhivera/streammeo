import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import { fetchAnalytics } from "../api/client";
import type { AnalyticsOverview } from "../types";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="vw-panel p-5">
      <p className="text-sm text-vw-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-vw-headline">{value}</p>
      {hint ? <p className="mt-1 text-xs text-vw-muted">{hint}</p> : null}
    </div>
  );
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    new: "bg-vw-elevated text-vw-muted",
    open: "bg-vw-accent-surface text-vw-accent",
    pending: "bg-vw-warning-soft text-vw-warning",
    resolved: "bg-vw-success-soft text-vw-success",
    closed: "bg-vw-elevated text-vw-fg-soft",
  };
  return map[status] ?? "bg-vw-elevated text-vw-muted";
}

export function DashboardPage(): ReactElement {
  usePageTitle("Dashboard");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(() => setError("Failed to load analytics"));
  }, []);

  if (error) {
    return <p className="text-vw-danger">{error}</p>;
  }

  if (!data) {
    return <p className="text-vw-muted">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live queue health, resolution metrics, CSAT scores, and your most recent tickets."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Open tickets" value={data.openTickets} />
        <StatCard label="Created today" value={data.ticketsToday} />
        <StatCard label="This week" value={data.ticketsThisWeek} />
        <StatCard
          label="CSAT score"
          value={data.csatAvgScore ?? "—"}
          hint={data.csatResponses > 0 ? `${data.csatResponses} responses` : "No surveys yet"}
        />
        <StatCard
          label="SLA breaches"
          value={data.slaBreaches}
          hint={data.slaBreaches > 0 ? "Needs attention" : "All on track"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="vw-panel p-5">
          <h2 className="text-lg font-medium text-vw-headline">Resolution rate</h2>
          <p className="mt-3 text-4xl font-semibold text-vw-success">{data.resolutionRate}%</p>
          <p className="mt-2 text-sm text-vw-muted">
            Avg resolution time: {data.avgResolutionHours}h
          </p>
        </div>
        <div className="vw-panel p-5">
          <h2 className="text-lg font-medium text-vw-headline">Open by priority</h2>
          <ul className="mt-4 space-y-2">
            {data.byPriority.map((row) => (
              <li key={row.priority} className="flex justify-between text-sm">
                <span className="capitalize text-vw-fg-soft">{row.priority}</span>
                <span className="font-medium text-vw-headline">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="vw-panel overflow-hidden">
        <div className="border-b border-vw-border px-5 py-4">
          <h2 className="text-lg font-medium text-vw-headline">Recent tickets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-vw-table-head text-vw-muted">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Subject</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-vw-border-faint">
                  <td className="px-5 py-3 font-mono text-vw-muted">#{ticket.number}</td>
                  <td className="px-5 py-3">
                    <Link to={`/tickets/${ticket.id}`} className="text-vw-fg hover:text-vw-accent">
                      {ticket.subject}
                    </Link>
                    {ticket.slaBreached ? (
                      <span className="ml-2 rounded bg-vw-danger-soft px-1.5 py-0.5 text-xs text-vw-danger">
                        SLA
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-vw-muted">
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
