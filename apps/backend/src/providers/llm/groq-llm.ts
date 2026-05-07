import type {
  ILlmProvider,
  LlmStreamResult,
  ToolDefinition,
} from "./llm.interface.ts";
import type { ChatMessage, SystemMessage, ToolCall } from "../../types/chat.ts";
import { createLogger } from "../../logger.ts";

const log = createLogger("LLM");

export interface GroqLlmConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export class GroqLlmProvider implements ILlmProvider {
  private baseUrl = "https://api.groq.com/openai/v1";

  constructor(private config: GroqLlmConfig) {}

  async streamCompletion(params: {
    messages: Array<SystemMessage | ChatMessage>;
    tools: ToolDefinition[];
    abortSignal: AbortSignal;
    onToken: (token: string) => void;
    onToolCallDetected?: () => void;
  }): Promise<LlmStreamResult> {
    const llmStart = performance.now();

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: params.messages,
      stream: true,
      max_tokens: this.config.maxTokens,
    };

    if (params.tools.length > 0) {
      body.tools = params.tools;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: params.abortSignal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error ${response.status}: ${text}`);
    }

    log.info(
      { durationMs: (performance.now() - llmStart).toFixed(0) },
      "Stream created",
    );

    let tokenCount = 0;
    let assistantText = "";
    let finishReason = "";
    const llmStreamStart = performance.now();

    // Accumulate tool call deltas
    const toolCallChunks = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();
    let toolCallDetectedFired = false;

    // Parse SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        let chunk: any;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }

        const choice = chunk.choices?.[0];
        if (!choice) continue;

        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }

        // Accumulate tool call deltas
        const deltaToolCalls = choice.delta?.tool_calls;
        if (deltaToolCalls) {
          if (!toolCallDetectedFired && params.onToolCallDetected) {
            toolCallDetectedFired = true;
            params.onToolCallDetected();
          }
          for (const tc of deltaToolCalls) {
            const idx = tc.index ?? 0;
            const existing = toolCallChunks.get(idx);
            if (existing) {
              existing.arguments += tc.function?.arguments ?? "";
            } else {
              toolCallChunks.set(idx, {
                id: tc.id ?? "",
                name: tc.function?.name ?? "",
                arguments: tc.function?.arguments ?? "",
              });
            }
          }
        }

        // Accumulate text content
        const token = choice.delta?.content ?? "";
        if (token) {
          tokenCount++;
          assistantText += token;
          if (tokenCount === 1) {
            log.info(
              { durationMs: (performance.now() - llmStreamStart).toFixed(0) },
              "First token",
            );
          }
          params.onToken(token);
        }
      }
    }

    log.info(
      {
        tokenCount,
        finishReason,
        durationMs: (performance.now() - llmStreamStart).toFixed(0),
      },
      "Stream complete",
    );

    const toolCalls: ToolCall[] = Array.from(toolCallChunks.values()).map(
      (tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      }),
    );

    return { finishReason, assistantText, toolCalls, tokenCount };
  }
}
