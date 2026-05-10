import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { Socket } from "socket.io";
import type { WorkspaceDTO } from "@voicewidget/db";

export type SessionState = "idle" | "listening" | "processing" | "speaking" | "ended";

export type ConvTurn = Readonly<{
  role: "user" | "assistant";
  text: string;
}>;

export class VoiceSession {
  readonly id: string;
  readonly workspaceId: string;
  readonly dbSessionId: string;
  readonly socket: Socket;

  state: SessionState = "idle";
  /** Human-readable conversation for logs + DB message rows */
  conversation: ConvTurn[] = [];
  /** Anthropic message history including tool calls/results */
  anthropicTurns: MessageParam[] = [];
  audioBuffer: Buffer[] = [];
  abortController: AbortController | null = null;

  constructor(params: {
    id: string;
    workspaceId: string;
    dbSessionId: string;
    socket: Socket;
  }) {
    this.id = params.id;
    this.workspaceId = params.workspaceId;
    this.dbSessionId = params.dbSessionId;
    this.socket = params.socket;
  }

  appendAudio(chunk: Buffer): void {
    this.audioBuffer.push(chunk);
  }

  clearAudio(): void {
    this.audioBuffer = [];
  }

  setBargein(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.setState("listening");
  }

  setState(s: SessionState): void {
    this.state = s;
    this.socket.emit("state", { state: s });
  }

  getSystemPrompt(workspace: WorkspaceDTO): string {
    return `${workspace.systemPrompt}\n\nYou are ${workspace.agentName}. Keep answers short and speakable (2–4 sentences). Do not use markdown or bullet lists.`;
  }
}
