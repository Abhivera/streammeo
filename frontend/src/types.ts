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

export type WidgetPosition = "bottom-right" | "bottom-left";
export type WidgetLauncherStyle = "circle" | "rounded";

export type WidgetLocaleStrings = {
  welcomeTitle?: string;
  welcomeMessage?: string;
  headerSubtitle?: string;
  quickPrompts?: string[];
  offlineTitle?: string;
  offlineMessage?: string;
  preChatNameLabel?: string;
  preChatEmailLabel?: string;
  proactiveMessage?: string;
  csatPrompt?: string;
};

export type WidgetSettings = {
  displayName: string | null;
  welcomeTitle: string;
  welcomeMessage: string;
  headerSubtitle: string;
  quickPrompts: string[];
  accentColor: string;
  panelBackground: string;
  chatBackground: string;
  textColor: string;
  mutedTextColor: string;
  position: WidgetPosition;
  launcherStyle: WidgetLauncherStyle;
  requirePreChatName: boolean;
  requirePreChatEmail: boolean;
  preChatNameLabel: string;
  preChatEmailLabel: string;
  launcherIconUrl: string | null;
  avatarUrl: string | null;
  businessHoursEnabled: boolean;
  businessHoursStart: number | null;
  businessHoursEnd: number | null;
  businessHoursTimezone: string;
  offlineTitle: string;
  offlineMessage: string;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  csatEnabled: boolean;
  csatPrompt: string;
  fileUploadEnabled: boolean;
  defaultLocale: string;
  locales: Record<string, WidgetLocaleStrings>;
  widgets: Record<string, Partial<WidgetSettings>>;
};

export type WidgetSettingsResponse = {
  widgetEnabled: boolean;
  settings: WidgetSettings;
};

export type TeamMember = {
  id: string;
  userId: string;
  role: "admin" | "manager" | "agent";
  user: { id: string; email: string; name: string | null };
};

export type TeamInviteSummary = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "agent";
  expiresAt: string;
  createdAt: string;
};

export type TeamMembersResponse = {
  items: TeamMember[];
  invites: TeamInviteSummary[];
  seatsUsed: number;
  seatsLimit: number;
};

export type TeamInvitePreview = {
  email: string;
  name: string;
  role: "admin" | "manager" | "agent";
  workspaceName: string;
  expiresAt: string;
  needsPassword: boolean;
  hasAccount: boolean;
};

export type AddTeamMemberResponse = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; email: string; name: string | null };
  isNewUser: boolean;
};

export type InviteTeamMemberResponse = {
  id: string;
  email: string;
  name: string;
  role: string;
  expiresAt: string;
  emailSent: boolean;
  inviteUrl?: string;
};

export type AcceptTeamInviteResponse = {
  token: string;
  user: User;
  workspace: Workspace;
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

export type ChatMessage = {
  role: string;
  body: string;
  createdAt: string;
  agentName?: string | null;
  attachments?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
    size: number;
  }>;
};

export type ChatSessionSummary = {
  id: string;
  visitorId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  status: string;
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string | null; email: string } | null;
  lastMessage: ChatMessage | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatSessionDetail = {
  id: string;
  visitorId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  status: string;
  ticketId: string | null;
  assignedAgent: { id: string; name: string | null; email: string } | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};
