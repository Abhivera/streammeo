import type {
  ChatAttachment,
  ChatMessage,
  KbArticle,
  PendingAttachment,
  PresignUploadResponse,
  WidgetConfig,
} from "./types";

type StartChatResponse = {
  sessionId: string;
  visitorId: string;
  messages: ChatMessage[];
  articles?: KbArticle[];
};

type SessionResponse = {
  sessionId: string;
  visitorId: string;
  status: string;
  messages: ChatMessage[];
  csatResponded?: boolean;
};

type MessageResponse = {
  message?: ChatMessage;
  reply?: ChatMessage;
  articles?: KbArticle[];
};

export function createChatApi(
  apiKey: string,
  apiBase: string,
  options?: { locale?: string | null; widgetId?: string | null },
) {
  const configQuery = new URLSearchParams();
  if (options?.locale) configQuery.set("locale", options.locale);
  if (options?.widgetId) configQuery.set("widgetId", options.widgetId);
  const configSuffix = configQuery.toString() ? `?${configQuery.toString()}` : "";

  async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(apiBase + path, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error("API error " + res.status);
    return res.json() as Promise<T>;
  }

  return {
    getConfig: () => request<WidgetConfig>(`/api/v1/workspace/widget-config${configSuffix}`, "GET"),
    getSession: (sessionId: string) => request<SessionResponse>(`/api/v1/chat/${sessionId}`, "GET"),
    presignUpload: (file: Pick<PendingAttachment, "name" | "mimeType" | "size">) =>
      request<PresignUploadResponse>("/api/v1/chat/uploads/presign", "POST", file),
    start: (message: string, visitor?: { name?: string; email?: string }, attachments?: PendingAttachment[]) =>
      request<StartChatResponse>("/api/v1/chat/start", "POST", {
        message,
        visitorName: visitor?.name,
        visitorEmail: visitor?.email,
        attachments,
      }),
    send: (sessionId: string, message: string, attachments?: PendingAttachment[]) =>
      request<MessageResponse>(`/api/v1/chat/${sessionId}/message`, "POST", {
        message,
        attachments,
      }),
    submitCsat: (sessionId: string, rating: number, comment?: string) =>
      request<{ ok: boolean }>(`/api/v1/chat/${sessionId}/csat`, "POST", { rating, comment }),
  };
}

export type { ChatAttachment };
