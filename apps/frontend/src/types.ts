export interface Workspace {
  id: string;
  name: string;
  apiKey: string;
  language: string;
  agentName: string;
  systemPrompt: string;
  plan: string;
  minutesUsed: number;
  minutesLimit: number;
  createdAt: string;
}

export interface SessionRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  resolved: boolean;
  messageCount: number;
}

export interface SessionDetail {
  id: string;
  workspaceId?: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  resolved: boolean;
  transcript: { id: string; role: string; text: string; createdAt: string }[];
  toolCalls: {
    id: string;
    toolName: string;
    input: object;
    output: object;
    createdAt: string;
  }[];
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
}
