import type { SarvamAIClient } from "sarvamai";
import type {
  ILlmProvider,
  LlmStreamResult,
  ToolDefinition,
} from "./llm.interface.ts";
import type { ChatMessage, SystemMessage, ToolCall } from "../../types/chat.ts";
import type { SarvamLlmConfig } from "../../config.ts";
import { createLogger } from "../../logger.ts";

const log = createLogger("LLM");

export class SarvamLlmProvider implements ILlmProvider {
  constructor(
    private client: SarvamAIClient,
    private config: SarvamLlmConfig,
  ) {}

  async streamCompletion(params: {
    messages: Array<SystemMessage | ChatMessage>;
    tools: ToolDefinition[];
    abortSignal: AbortSignal;
    onToken: (token: string) => void;
    onToolCallDetected?: () => void;
  }): Promise<LlmStreamResult> {
    const llmStart = performance.now();

    const response = await this.client.chat.completions(
      {
        model: this.config.model as any,
        messages: params.messages as any,
        stream: true,
        max_tokens: this.config.maxTokens,
        reasoning_effort: this.config.reasoningEffort as any,
        tools: params.tools as any,
      },
      {
        abortSignal: params.abortSignal,
      },
    );

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

    for await (const chunk of response) {
      const choice = chunk.choices[0];
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }

      // Accumulate tool call deltas
      const deltaToolCalls = choice?.delta?.tool_calls;
      if (deltaToolCalls) {
        // Fire onToolCallDetected on the very first tool call delta
        if (!toolCallDetectedFired && params.onToolCallDetected) {
          toolCallDetectedFired = true;
          params.onToolCallDetected();
        }
        for (const tc of deltaToolCalls) {
          const existing = toolCallChunks.get(tc.index);
          if (existing) {
            existing.arguments += tc.function?.arguments ?? "";
          } else {
            toolCallChunks.set(tc.index, {
              id: tc.id ?? "",
              name: tc.function?.name ?? "",
              arguments: tc.function?.arguments ?? "",
            });
          }
        }
      }

      // Accumulate text content
      const token = choice?.delta?.content ?? "";
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

    log.info(
      {
        tokenCount,
        finishReason,
        durationMs: (performance.now() - llmStreamStart).toFixed(0),
      },
      "Stream complete",
    );

    // Convert accumulated tool call chunks to ToolCall array
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
