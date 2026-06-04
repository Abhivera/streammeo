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
    createdAt: String(r.createdAt),
  };
}

export function toUserDTO(r: Record<string, unknown>): UserDTO {
  const firebaseUid =
    typeof r.firebaseUid === "string" && r.firebaseUid.length > 0 ? r.firebaseUid : undefined;
  return {
    id: String(r.id),
    email: String(r.email),
    password: String(r.password),
    createdAt: String(r.createdAt),
    ...(firebaseUid ? { firebaseUid } : {}),
  };
}

export function toSessionDTO(r: Record<string, unknown>): SessionDTO {
  return {
    id: String(r.id),
    workspaceId: String(r.workspaceId),
    startedAt: isoFromMs(Number(r.startedAt)),
    endedAt: typeof r.endedAt === "string" ? r.endedAt : null,
    durationSec: Number(r.durationSec ?? 0),
    resolved: Boolean(r.resolved),
    messageCount: Number(r.messageCount ?? 0),
  };
}

export function toMessageDTO(r: Record<string, unknown>): MessageDTO {
  return {
    id: String(r.id),
    sessionId: String(r.sessionId),
    workspaceId: String(r.workspaceId),
    role: String(r.role),
    text: String(r.text),
    audioUrl: r.audioUrl != null ? String(r.audioUrl) : null,
    createdAt: isoFromMs(Number(r.createdAt)),
  };
}

export function toToolCallDTO(r: Record<string, unknown>): ToolCallDTO {
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
    createdAt: isoFromMs(Number(r.createdAt)),
  };
}

export function toFaqDTO(r: Record<string, unknown>): FaqDTO {
  const emb = Array.isArray(r.embedding) ? r.embedding.map((v) => Number(v)) : [];
  return {
    id: String(r.id),
    workspaceId: String(r.workspaceId),
    question: String(r.question),
    answer: String(r.answer),
    embedding: emb,
    createdAt: isoFromMs(Number(r.createdAt)),
  };
}
