import Groq from "groq-sdk";
import type { LlmTool } from "../tools/registry";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export type LlmMessage =
  | Readonly<{ role: "system"; content: string }>
  | Readonly<{ role: "user"; content: string }>
  | Readonly<{
      role: "assistant";
      content: string;
      tool_calls?: ReadonlyArray<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    }>
  | Readonly<{ role: "tool"; tool_call_id: string; content: string }>;

export type AssistantTurnOutcome = Readonly<{
  stopReason: string | null;
  /** Visible assistant text for this model turn */
  assistantText: string;
  toolUses: ReadonlyArray<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  assistantMessage: LlmMessage;
}>;

export async function runAssistantStreamingTurn(params: Readonly<{
  client: Groq;
  systemPrompt: string;
  messages: LlmMessage[];
  tools: readonly LlmTool[];
  abortSignal: AbortSignal;
}>): Promise<AssistantTurnOutcome> {
  const completion = await params.client.chat.completions.create(
    {
      model: GROQ_MODEL,
      max_tokens: 1024,
      temperature: 0.4,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages,
      ] as never,
      tools: [...params.tools] as never,
      tool_choice: "auto",
    },
    { signal: params.abortSignal },
  );
  const choice = completion.choices[0];
  const rawMessage = choice?.message;
  const rawToolCalls = rawMessage?.tool_calls ?? [];

  const toolUses: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }> = [];
  for (const call of rawToolCalls) {
    if (call.type === "function") {
      const argsRaw = call.function.arguments ?? "{}";
      let input: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(argsRaw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          input = parsed as Record<string, unknown>;
        }
      } catch {
        input = {};
      }
      toolUses.push({
        id: call.id,
        name: call.function.name,
        input,
      });
    }
  }

  const assistantText =
    typeof rawMessage?.content === "string" ? rawMessage.content.trim() : "";
  const assistantMessage: LlmMessage = {
    role: "assistant",
    content: assistantText,
    ...(rawToolCalls.length > 0
      ? {
          tool_calls: rawToolCalls
            .filter((c) => c.type === "function")
            .map((c) => ({
              id: c.id,
              type: "function" as const,
              function: {
                name: c.function.name,
                arguments: c.function.arguments ?? "{}",
              },
            })),
        }
      : {}),
  };

  return {
    stopReason: choice?.finish_reason ?? null,
    assistantText,
    toolUses,
    assistantMessage,
  };
}
