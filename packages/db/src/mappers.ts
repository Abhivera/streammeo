import type {
  FaqDTO,
  MessageDTO,
  SessionDTO,
  ToolCallDTO,
  UserDTO,
  WorkspaceDTO,
} from "./entities";

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

/** Strip Dynamo-only bookkeeping fields before JSON responses */
export function toWorkspaceDTO(r: Record<string, unknown>): WorkspaceDTO {
  return {
    id: String(r.id),
    name: String(r.name),
    apiKey: String(r.apiKey),
    language: String(r.language ?? "en"),
    agentName: String(r.agentName ?? "Alex"),
    systemPrompt: String(r.systemPrompt ?? ""),
    plan: String(r.plan ?? "free"),
    minutesUsed: Number(r.minutesUsed ?? 0),
    minutesLimit: Number(r.minutesLimit ?? 0),
    ownerId: String(r.ownerId),
    shopifyShopDomain: r.shopifyShopDomain != null ? String(r.shopifyShopDomain) : null,
    shopifyAccessToken: r.shopifyAccessToken != null ? String(r.shopifyAccessToken) : null,
    ...(typeof r.sessionCount === "number" ? { sessionCount: r.sessionCount } : {}),
    createdAt:
      typeof r.createdAt === "string"
        ? r.createdAt
        : typeof r.createdAtMs === "number"
          ? isoFromMs(r.createdAtMs)
          : new Date().toISOString(),
  };
}

export function toUserDTO(r: Record<string, unknown>): UserDTO {
  return {
    id: String(r.id),
    email: String(r.email),
    password: String(r.password),
    createdAt: typeof r.createdAt === "string" ? r.createdAt : isoFromMs(Number(r.createdAtMs)),
  };
}

export function toSessionDTO(r: Record<string, unknown>): SessionDTO {
  const startedMs = typeof r.startedAt === "number" ? r.startedAt : Number(r.startedAtMs);
  return {
    id: String(r.id),
    workspaceId: String(r.workspaceId),
    startedAt: Number.isFinite(startedMs) ? isoFromMs(startedMs) : new Date().toISOString(),
    endedAt: typeof r.endedAt === "string" ? r.endedAt : null,
    durationSec: Number(r.durationSec ?? 0),
    resolved: Boolean(r.resolved),
    messageCount: Number(r.messageCount ?? 0),
  };
}

export function toMessageDTO(r: Record<string, unknown>): MessageDTO {
  const createdMs = typeof r.createdAt === "number" ? r.createdAt : Number(r.createdAtMs);
  return {
    id: String(r.id),
    sessionId: String(r.sessionId),
    workspaceId: String(r.workspaceId),
    role: String(r.role),
    text: String(r.text),
    audioUrl: r.audioUrl != null ? String(r.audioUrl) : null,
    createdAt: Number.isFinite(createdMs) ? isoFromMs(createdMs) : new Date().toISOString(),
  };
}

export function toToolCallDTO(r: Record<string, unknown>): ToolCallDTO {
  const createdMs = typeof r.createdAt === "number" ? r.createdAt : Number(r.createdAtMs);
  return {
    id: String(r.id),
    sessionId: String(r.sessionId),
    toolName: String(r.toolName),
    input:
      r.input && typeof r.input === "object" && !Array.isArray(r.input)
        ? (r.input as Record<string, unknown>)
        : {},
    output:
      r.output && typeof r.output === "object" && !Array.isArray(r.output)
        ? (r.output as Record<string, unknown>)
        : {},
    createdAt: Number.isFinite(createdMs) ? isoFromMs(createdMs) : new Date().toISOString(),
  };
}

export function toFaqDTO(r: Record<string, unknown>): FaqDTO {
  const emb = Array.isArray(r.embedding) ? r.embedding.map((v) => Number(v)) : [];
  const createdMs = typeof r.createdAt === "number" ? r.createdAt : Number(r.createdAtMs ?? 0);
  return {
    id: String(r.id),
    workspaceId: String(r.workspaceId),
    question: String(r.question),
    answer: String(r.answer),
    embedding: emb,
    createdAt: Number.isFinite(createdMs) ? isoFromMs(createdMs) : new Date().toISOString(),
  };
}
