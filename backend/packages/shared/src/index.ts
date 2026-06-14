export const PLANS = {
  starter: {
    name: "Starter",
    priceMonthly: 249900,
    agentsLimit: 3,
    ticketsLimit: 500,
    inboxesLimit: 1,
    aiRepliesLimit: 0,
    kbArticlesLimit: 50,
  },
  growth: {
    name: "Growth",
    priceMonthly: 649900,
    agentsLimit: 10,
    ticketsLimit: 5000,
    inboxesLimit: 5,
    aiRepliesLimit: 500,
    kbArticlesLimit: 500,
  },
  business: {
    name: "Business",
    priceMonthly: 1649900,
    agentsLimit: 50,
    ticketsLimit: Number.MAX_SAFE_INTEGER,
    inboxesLimit: Number.MAX_SAFE_INTEGER,
    aiRepliesLimit: Number.MAX_SAFE_INTEGER,
    kbArticlesLimit: Number.MAX_SAFE_INTEGER,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const TICKET_STATUSES = ["new", "open", "pending", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const VALID_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  new: ["open", "closed"],
  open: ["pending", "resolved", "closed"],
  pending: ["open", "resolved", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

export function canTransitionTicketStatus(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}
