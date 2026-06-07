export type TicketStatus = "new" | "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type User = {
  id: string;
  email: string;
  name: string | null;
  role?: "admin" | "manager" | "agent";
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  apiKey?: string;
  ticketsUsed?: number;
  ticketsLimit?: number;
};

export type TicketSummary = {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterEmail: string;
  requesterName: string | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string | null; email: string } | null;
  tags: { id: string; name: string; color: string }[];
  commentCount: number;
};

export type TicketDetail = TicketSummary & {
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  inbox: { id: string; name: string; email: string } | null;
  slaPolicy: {
    id: string;
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
  } | null;
  comments: Array<{
    id: string;
    body: string;
    visibility: "public" | "internal";
    isEmail: boolean;
    createdAt: string;
    author: { id: string; name: string | null; email: string } | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    payload: unknown;
    createdAt: string;
  }>;
};

export type AnalyticsOverview = {
  openTickets: number;
  ticketsToday: number;
  ticketsThisWeek: number;
  totalTickets: number;
  resolutionRate: number;
  slaBreaches: number;
  avgResolutionHours: number;
  csatAvgScore: number | null;
  csatResponses: number;
  byStatus: { status: TicketStatus; count: number }[];
  byPriority: { priority: TicketPriority; count: number }[];
  recentTickets: Array<{
    id: string;
    number: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    updatedAt: string;
    slaBreached: boolean;
  }>;
};

export type Inbox = {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  autoResponderEnabled: boolean;
  autoResponderMessage: string | null;
};

export type SlaPolicy = {
  id: string;
  name: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  isDefault: boolean;
  priority: TicketPriority | null;
};

export type CannedResponse = {
  id: string;
  title: string;
  body: string;
};

export type KbArticle = {
  id: string;
  title: string;
  slug: string;
  content: string;
  visibility: "public" | "internal" | "gated";
  publishedAt: string | null;
  category?: { id: string; name: string } | null;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type BillingPlan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceDisplay: string;
  agentsLimit: number;
  ticketsLimit: number;
  inboxesLimit: number;
  aiRepliesLimit: number;
};

export type PresenceUser = {
  userId: string;
  name: string;
  typing: boolean;
};
