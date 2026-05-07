import type { ChatMessage, SystemMessage, ToolCall } from "./chat.ts";

// ── STT Provider ──

export interface SttCallbacks {
  onStartSpeech: () => void;
  onEndSpeech: () => void;
  onTranscript: (transcript: string) => void;
  onError: (err: Error) => void;
}

export interface ISttProvider {
  connect(): Promise<void>;
  transcribe(audioBase64: string): void;
  flush(): void;
  close(): void;
  readonly isConnected: boolean;
}

// ── TTS Provider ──

export interface TtsCallbacks {
  onAudioChunk: (audioBase64: string) => void;
  onSynthesisComplete: () => void;
  onError: (err: Error) => void;
}

export interface ITtsProvider {
  ensureConnected(): Promise<void>;
  convert(text: string): void;
  flush(): void;
  close(): void;
}

// ── LLM Provider ──

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}

export interface LlmStreamResult {
  finishReason: string;
  assistantText: string;
  toolCalls: ToolCall[];
  tokenCount: number;
}

export interface ILlmProvider {
  streamCompletion(params: {
    messages: Array<SystemMessage | ChatMessage>;
    tools: ToolDefinition[];
    abortSignal: AbortSignal;
    onToken: (token: string) => void;
    onToolCallDetected?: () => void;
  }): Promise<LlmStreamResult>;
}
