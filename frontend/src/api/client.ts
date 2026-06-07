import axios from "axios";
import type {
  AnalyticsOverview,
  BillingPlan,
  CannedResponse,
  Inbox,
  KbArticle,
  SlaPolicy,
  Tag,
  TicketDetail,
  TicketStatus,
  TicketSummary,
  User,
  Workspace,
} from "../types";

const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{
    token: string;
    user: User;
    workspace: Workspace;
  }>("/api/v1/auth/login", { email, password });
  return data;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
}) {
  const { data } = await api.post<{
    token: string;
    user: User;
    workspace: Workspace;
  }>("/api/v1/auth/register", input);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User; workspace: Workspace }>("/api/v1/auth/me");
  return data;
}

export async function fetchTickets(params?: {
  status?: TicketStatus;
  search?: string;
  cursor?: string;
}) {
  const { data } = await api.get<{ items: TicketSummary[]; nextCursor: string | null }>(
    "/api/v1/tickets",
    { params },
  );
  return data;
}

export async function fetchTicket(id: string) {
  const { data } = await api.get<TicketDetail>(`/api/v1/tickets/${id}`);
  return data;
}

export async function updateTicket(
  id: string,
  patch: Partial<{
    status: TicketStatus;
    priority: string;
    assigneeId: string | null;
    subject: string;
  }>,
) {
  const { data } = await api.patch<TicketDetail>(`/api/v1/tickets/${id}`, patch);
  return data;
}

export async function addTicketComment(
  id: string,
  body: string,
  visibility: "public" | "internal" = "public",
) {
  const { data } = await api.post(`/api/v1/tickets/${id}/comments`, { body, visibility });
  return data;
}

export async function fetchAnalytics() {
  const { data } = await api.get<AnalyticsOverview>("/api/v1/analytics/overview");
  return data;
}

export async function fetchInboxes() {
  const { data } = await api.get<{ items: Inbox[] }>("/api/v1/inboxes");
  return data.items;
}

export async function fetchSlaPolicies() {
  const { data } = await api.get<{ items: SlaPolicy[] }>("/api/v1/sla-policies");
  return data.items;
}

export async function fetchBillingUsage() {
  const { data } = await api.get<{
    plan: string;
    planName: string;
    ticketsUsed: number;
    ticketsLimit: number;
    aiRepliesUsed?: number;
    aiRepliesLimit?: number;
  }>("/api/v1/billing/usage");
  return data;
}

export async function fetchBillingPlans() {
  const { data } = await api.get<{ plans: BillingPlan[]; razorpayKeyId: string | null }>(
    "/api/v1/billing/plans",
  );
  return data;
}

export type BillingCheckoutOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planId: string;
  planName: string;
  prefill: { email?: string; name?: string };
};

export async function createBillingOrder(planId: string) {
  const { data } = await api.post<BillingCheckoutOrder>("/api/v1/billing/checkout", { planId });
  return data;
}

export async function verifyBillingPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const { data } = await api.post<{ ok: boolean; plan: string }>("/api/v1/billing/verify", input);
  return data;
}

export async function bulkUpdateTickets(input: {
  ticketIds: string[];
  status?: TicketStatus;
  assigneeId?: string | null;
  tagIds?: string[];
  delete?: boolean;
}) {
  const { data } = await api.post<{ deleted: number; tickets: TicketSummary[] }>(
    "/api/v1/tickets/bulk",
    input,
  );
  return data;
}

export async function fetchTags() {
  const { data } = await api.get<{ items: Tag[] }>("/api/v1/tags");
  return data.items;
}

export async function fetchCannedResponses() {
  const { data } = await api.get<{ items: CannedResponse[] }>("/api/v1/canned-responses");
  return data.items;
}

export async function createCannedResponse(title: string, body: string) {
  const { data } = await api.post<CannedResponse>("/api/v1/canned-responses", { title, body });
  return data;
}

export async function deleteCannedResponse(id: string) {
  await api.delete(`/api/v1/canned-responses/${id}`);
}

export async function suggestAiReply(ticketId: string) {
  const { data } = await api.post<{ suggestion: string }>("/api/v1/ai/suggest-reply", { ticketId });
  return data.suggestion;
}

export async function fetchKbArticles() {
  const { data } = await api.get<{ items: KbArticle[] }>("/api/v1/kb/articles");
  return data.items;
}

export async function createKbArticle(input: {
  title: string;
  content: string;
  visibility?: string;
  published?: boolean;
}) {
  const { data } = await api.post<KbArticle>("/api/v1/kb/articles", input);
  return data;
}

export async function deleteKbArticle(id: string) {
  await api.delete(`/api/v1/kb/articles/${id}`);
}

export async function getTicketPortalLink(ticketId: string) {
  const { data } = await api.get<{ url: string }>(`/api/v1/tickets/${ticketId}/portal-link`);
  return data.url;
}
