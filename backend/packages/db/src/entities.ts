/** API-shaped workspace row (camelCase ISO dates) */
export type WorkspaceDTO = Readonly<{
  id: string;
  name: string;
  apiKey: string;
  language: string;
  agentName: string;
  systemPrompt: string;
  plan: string;
  minutesUsed: number;
  minutesLimit: number;
  ownerId: string;
  shopifyShopDomain: string | null;
  shopifyAccessToken: string | null;
  createdAt: string;
  /** Sessions created (counter; list/total uses this). */
  sessionCount?: number;
}>;

export type UserDTO = Readonly<{
  id: string;
  email: string;
  password: string;
  createdAt: string;
  /** Set when the user has signed in with Firebase at least once. */
  firebaseUid?: string | undefined;
}>;

export type SessionDTO = Readonly<{
  id: string;
  workspaceId: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  resolved: boolean;
  messageCount: number;
}>;

export type MessageDTO = Readonly<{
  id: string;
  sessionId: string;
  workspaceId: string;
  role: string;
  text: string;
  audioUrl: string | null;
  createdAt: string;
}>;

export type ToolCallDTO = Readonly<{
  id: string;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: string;
}>;

export type FaqDTO = Readonly<{
  id: string;
  workspaceId: string;
  question: string;
  answer: string;
  embedding: number[];
  createdAt: string;
}>;
