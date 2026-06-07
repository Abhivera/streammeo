import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bulkUpdateTickets, fetchTickets } from "../api/client";
import { subscribeToTicketEvents } from "../realtime/appsync";
import { useAuthStore } from "../store/auth";
import type { TicketStatus, TicketSummary } from "../types";

const STATUS_FILTERS: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "New", value: "new" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

function priorityClass(priority: string): string {
  const map: Record<string, string> = {
    low: "text-vw-muted",
    normal: "text-vw-fg-soft",
    high: "text-vw-warning",
    urgent: "text-vw-danger",
  };
  return map[priority] ?? "text-vw-fg-soft";
}

export function TicketsPage(): ReactElement {
  const workspaceId = useAuthStore((s) => s.workspace?.id);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    fetchTickets({ status, search: search || undefined })
      .then((res) => setTickets(res.items))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    const unsubscribe = subscribeToTicketEvents(workspaceId, {
      onTicketEvent: () => load(),
    });
    return () => unsubscribe?.();
  }, [workspaceId, load]);

  const toggleAll = () => {
    if (selected.size === tickets.length) setSelected(new Set());
    else setSelected(new Set(tickets.map((t) => t.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: { status?: TicketStatus; delete?: boolean }) => {
    if (selected.size === 0) return;
    if (action.delete && !confirm(`Delete ${selected.size} ticket(s)?`)) return;
    await bulkUpdateTickets({ ticketIds: [...selected], ...action });
    setSelected(new Set());
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-vw-headline">Ticket queue</h1>
          <p className="mt-1 text-sm text-vw-muted">Unified inbox for all support channels</p>
        </div>
        <input
          type="search"
          placeholder="Search tickets…"
          className="vw-input sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === f.value
                ? "bg-vw-accent text-vw-accent-fg"
                : "bg-vw-elevated text-vw-muted hover:text-vw-fg"
            }`}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-vw-border bg-vw-elevated px-4 py-3 text-sm">
          <span className="text-vw-muted">{selected.size} selected</span>
          <button type="button" className="vw-btn-secondary py-1 text-xs" onClick={() => void runBulk({ status: "closed" })}>
            Close
          </button>
          <button type="button" className="vw-btn-secondary py-1 text-xs" onClick={() => void runBulk({ status: "resolved" })}>
            Resolve
          </button>
          <button type="button" className="text-xs text-vw-danger hover:underline" onClick={() => void runBulk({ delete: true })}>
            Delete
          </button>
        </div>
      ) : null}

      <div className="vw-panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-vw-muted">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="p-6 text-vw-muted">No tickets match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-vw-table-head text-vw-muted">
                <tr>
                  <th className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === tickets.length && tickets.length > 0}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Ticket</th>
                  <th className="px-5 py-3 font-medium">Requester</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Assignee</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-vw-border-faint hover:bg-vw-elevated/40">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(ticket.id)}
                        onChange={() => toggleOne(ticket.id)}
                        aria-label={`Select ticket ${ticket.number}`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/tickets/${ticket.id}`} className="block">
                        <span className="font-mono text-xs text-vw-muted">#{ticket.number}</span>
                        <span className="mt-0.5 block font-medium text-vw-fg">{ticket.subject}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-vw-fg-soft">
                      {ticket.requesterName ?? ticket.requesterEmail}
                    </td>
                    <td className={`px-5 py-3 capitalize ${priorityClass(ticket.priority)}`}>
                      {ticket.priority}
                    </td>
                    <td className="px-5 py-3 capitalize text-vw-fg-soft">{ticket.status}</td>
                    <td className="px-5 py-3 text-vw-muted">
                      {ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-3 text-vw-muted">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
