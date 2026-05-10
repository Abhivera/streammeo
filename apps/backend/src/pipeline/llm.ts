import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages";

export const CLAUDE_MODEL = "claude-sonnet-4-20250514";

export type AssistantTurnOutcome = Readonly<{
  stopReason: string | null;
  /** Concatenated visible assistant text blocks for this model turn */
  assistantText: string;
  toolUses: ReadonlyArray<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  /** Exact assistant content blocks (text + tool_use) */
  assistantContent: Message["content"];
}>;

export async function runAssistantStreamingTurn(params: Readonly<{
  client: Anthropic;
  systemPrompt: string;
  messages: MessageParam[];
  tools: readonly Tool[];
  abortSignal: AbortSignal;
}>): Promise<AssistantTurnOutcome> {
  const stream = params.client.messages.stream(
    {
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      temperature: 0.4,
      system: params.systemPrompt,
      messages: [...params.messages],
      tools: [...params.tools],
    },
    { signal: params.abortSignal },
  );

  const message = await stream.finalMessage();

  const toolUses: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }> = [];
  const textParts: string[] = [];

  for (const block of message.content) {
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
    }
    if (block.type === "tool_use") {
      toolUses.push({
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      });
    }
  }

  return {
    stopReason: message.stop_reason,
    assistantText: textParts.join("").trim(),
    toolUses,
    assistantContent: message.content,
  };
}
