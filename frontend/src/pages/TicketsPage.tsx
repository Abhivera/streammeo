import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { bulkUpdateTickets, fetchTeamMembers, fetchTickets } from "../api/client";
import { isAppSyncConfigured, REMOTE_POLL_INTERVAL_MS } from "../config";
import { formatRelativeTime } from "../lib/formatTime";
import { priorityTextClass } from "../lib/ticketUi";
import { subscribeToTicketEvents } from "../realtime/appsync";
import { useAuthStore } from "../store/auth";
import type { TicketStatus } from "../types";

const STATUS_FILTERS: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "New", value: "new" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

function TicketsSkeleton(): ReactElement {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="vw-skeleton h-12 rounded-lg" />
      ))}
    </div>
  );
}

export function TicketsPage(): ReactElement {
  usePageTitle("Tickets");
  const user = useAuthStore((s) => s.user);
  const workspaceId = useAuthStore((s) => s.workspace?.id);
  const canManageAssignees = user?.role === "admin" || user?.role === "manager";
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");

  const { data: teamData } = useAsyncData(
    () => (canManageAssignees ? fetchTeamMembers() : Promise.resolve(null)),
    [canManageAssignees],
  );

  const {
    data: tickets,
    loading,
    reload,
  } = useAsyncData(
    () => fetchTickets({ status, search: search || undefined }).then((res) => res.items),
    [status, search],
  );

  const ticketList = tickets ?? [];

  useEffect(() => {
    if (!workspaceId) return;
    const unsubscribe = subscribeToTicketEvents(workspaceId, {
      onTicketEvent: () => reload(),
    });
    return () => unsubscribe?.();
  }, [workspaceId, reload]);

  useEffect(() => {
    if (!workspaceId || isAppSyncConfigured()) return;
    const timer = window.setInterval(reload, REMOTE_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [workspaceId, reload]);

  const toggleAll = () => {
    if (selected.size === ticketList.length) setSelected(new Set());
    else setSelected(new Set(ticketList.map((t) => t.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: {
    status?: TicketStatus;
    assigneeId?: string | null;
    delete?: boolean;
  }) => {
    if (selected.size === 0) return;
    if (action.delete && !confirm(`Delete ${selected.size} ticket(s)?`)) return;
    try {
      await bulkUpdateTickets({ ticketIds: [...selected], ...action });
      setSelected(new Set());
      setBulkAssigneeId("");
      reload();
    } catch {
      alert("Bulk action failed. Check your permissions and try again.");
    }
  };

  const runBulkAssign = () => {
    if (!bulkAssigneeId) return;
    void runBulk({
      assigneeId: bulkAssigneeId === "__unassigned__" ? null : bulkAssigneeId,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Ticket queue"
        description="All support channels in one place. Filter by status, search by subject or requester, and run bulk actions on selected tickets."
      >
        <input
          type="search"
          placeholder="Search tickets…"
          className="vw-input !mt-0 w-full sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </PageHeader>

      <div className="vw-scroll-strip">
        <div className="vw-scroll-strip-inner">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              className={`vw-filter-pill shrink-0 ${status === f.value ? "vw-filter-pill-active" : "bg-vw-elevated/60"}`}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-vw-accent/30 bg-vw-accent-surface px-4 py-3 text-sm">
          <span className="font-medium text-vw-accent">{selected.size} selected</span>
          <button
            type="button"
            className="vw-btn-secondary py-1 text-xs"
            onClick={() => void runBulk({ status: "closed" })}
          >
            Close
          </button>
          <button
            type="button"
            className="vw-btn-secondary py-1 text-xs"
            onClick={() => void runBulk({ status: "resolved" })}
          >
            Resolve
          </button>
          {canManageAssignees && teamData ? (
            <>
              <select
                className="vw-select py-1 text-xs"
                value={bulkAssigneeId}
                onChange={(e) => setBulkAssigneeId(e.target.value)}
                aria-label="Bulk assign tickets"
              >
                <option value="">Assign to…</option>
                <option value="__unassigned__">Unassigned</option>
                {teamData.items.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name ?? member.user.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="vw-btn-secondary py-1 text-xs"
                disabled={!bulkAssigneeId}
                onClick={runBulkAssign}
              >
                Assign
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="text-xs text-vw-danger transition-colors hover:underline"
            onClick={() => void runBulk({ delete: true })}
          >
            Delete
          </button>
        </div>
      ) : null}

      <div className="vw-panel overflow-hidden">
        {loading ? (
          <TicketsSkeleton />
        ) : ticketList.length === 0 ? (
          <EmptyState
            icon={search || status ? "search" : "inbox"}
            title="No tickets found"
            description={
              search || status
                ? "Try adjusting your filters or search terms."
                : "New tickets from email, chat, and web forms will appear here."
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-vw-border-faint md:hidden">
              {ticketList.map((ticket) => (
                <li key={ticket.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="vw-checkbox mt-1"
                      checked={selected.has(ticket.id)}
                      onChange={() => toggleOne(ticket.id)}
                      aria-label={`Select ticket ${ticket.number}`}
                    />
                    <div className="min-w-0 flex-1">
                      <Link to={`/tickets/${ticket.id}`} className="block">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-vw-muted">#{ticket.number}</span>
                          <StatusBadge status={ticket.status} />
                        </div>
                        <p className="mt-1 break-words font-medium text-vw-fg">{ticket.subject}</p>
                      </Link>
                      <p className="mt-2 text-xs text-vw-muted">
                        {ticket.requesterName ?? ticket.requesterEmail}
                        <span className="mx-1.5">·</span>
                        <span className={`capitalize ${priorityTextClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-vw-muted">
                        {ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned"}
                        <span className="mx-1.5">·</span>
                        <span title={new Date(ticket.updatedAt).toLocaleString()}>
                          {formatRelativeTime(ticket.updatedAt)}
                        </span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="vw-table-head">
                  <tr>
                    <th className="px-5 py-3">
                      <input
                        type="checkbox"
                        className="vw-checkbox"
                        checked={selected.size === ticketList.length && ticketList.length > 0}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-5 py-3">Ticket</th>
                    <th className="px-5 py-3">Requester</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Assignee</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketList.map((ticket) => (
                    <tr key={ticket.id} className="vw-table-row">
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          className="vw-checkbox"
                          checked={selected.has(ticket.id)}
                          onChange={() => toggleOne(ticket.id)}
                          aria-label={`Select ticket ${ticket.number}`}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <Link to={`/tickets/${ticket.id}`} className="group block">
                          <span className="font-mono text-xs text-vw-muted">#{ticket.number}</span>
                          <span className="mt-0.5 block font-medium text-vw-fg transition-colors group-hover:text-vw-accent">
                            {ticket.subject}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-vw-fg-soft">
                        {ticket.requesterName ?? ticket.requesterEmail}
                      </td>
                      <td className={`px-5 py-3.5 capitalize ${priorityTextClass(ticket.priority)}`}>
                        {ticket.priority}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-5 py-3.5 text-vw-muted">
                        {ticket.assignee?.name ?? ticket.assignee?.email ?? (
                          <span className="italic">Unassigned</span>
                        )}
                      </td>
                      <td
                        className="px-5 py-3.5 text-vw-muted"
                        title={new Date(ticket.updatedAt).toLocaleString()}
                      >
                        {formatRelativeTime(ticket.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
