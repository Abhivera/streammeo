export type MemberRole = "admin" | "manager" | "agent";
export type TicketStatus = "new" | "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type CommentVisibility = "public" | "internal";
export type InboxChannel = "email" | "web_form" | "api" | "chat";
export type ArticleVisibility = "public" | "internal" | "gated";
export type ChatSessionStatus = "active" | "converted" | "closed";

export type RoutingRule = { field: string; operator: string; value: string };

export type User = {
  id: string;
  email: string;
  password: string | null;
  name: string | null;
  firebaseUid: string | null;
  createdAt: string;
};

export type PasswordResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

import type { WidgetSettings } from "./widget.js";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  plan: string;
  ticketsUsed: number;
  ticketsLimit: number;
  aiRepliesUsed: number;
  aiRepliesLimit: number;
  razorpaySubscriptionId: string | null;
  widgetEnabled: boolean;
  widgetSettings?: WidgetSettings | null;
  lastTicketNumber: number;
  createdAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
};

export type TeamInvite = {
  id: string;
  workspaceId: string;
  email: string;
  name: string;
  role: MemberRole;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type Inbox = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  channel: InboxChannel;
  isDefault: boolean;
  autoResponderEnabled: boolean;
  autoResponderMessage: string | null;
  businessHoursStart: number | null;
  businessHoursEnd: number | null;
  routingRules: RoutingRule[];
  createdAt: string;
};

export type Ticket = {
  id: string;
  workspaceId: string;
  inboxId: string | null;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterEmail: string;
  requesterName: string | null;
  assigneeId: string | null;
  slaPolicyId: string | null;
  slaBreached: boolean;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorId: string | null;
  body: string;
  visibility: CommentVisibility;
  isEmail: boolean;
  createdAt: string;
};

export type TicketEvent = {
  id: string;
  ticketId: string;
  actorId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Tag = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
};

export type SlaPolicy = {
  id: string;
  workspaceId: string;
  name: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  priority: TicketPriority | null;
  isDefault: boolean;
};

export type CannedResponse = {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
};

export type KbCategory = {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
};

export type KbArticle = {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  content: string;
  visibility: ArticleVisibility;
  helpfulYes: number;
  helpfulNo: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CsatSurvey = {
  id: string;
  ticketId: string;
  rating: number | null;
  comment: string | null;
  sentAt: string;
  respondedAt: string | null;
};

export type PortalToken = {
  id: string;
  ticketId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  workspaceId: string;
  ticketId: string | null;
  visitorId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  assignedAgentId: string | null;
  status: ChatSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: string;
  body: string;
  createdAt: string;
  attachments?: ChatAttachment[];
};

export type ChatCsatSurvey = {
  sessionId: string;
  rating: number | null;
  comment: string | null;
  respondedAt: string | null;
};

export type UserPublic = Pick<User, "id" | "name" | "email">;
