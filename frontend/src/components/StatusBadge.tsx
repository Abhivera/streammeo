import type { ReactElement } from "react";
import type { TicketStatus } from "../types";

const STATUS_STYLES: Record<TicketStatus, { badge: string; dot: string }> = {
  new: { badge: "bg-vw-elevated text-vw-muted", dot: "bg-vw-muted" },
  open: { badge: "bg-vw-accent-surface text-vw-accent", dot: "bg-vw-accent" },
  pending: { badge: "bg-vw-warning-soft text-vw-warning", dot: "bg-vw-warning" },
  resolved: { badge: "bg-vw-success-soft text-vw-success", dot: "bg-vw-success" },
  closed: { badge: "bg-vw-elevated text-vw-fg-soft", dot: "bg-vw-fg-soft" },
};

type StatusBadgeProps = {
  status: TicketStatus | string;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps): ReactElement {
  const style = STATUS_STYLES[status as TicketStatus] ?? STATUS_STYLES.new;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {status}
    </span>
  );
}
