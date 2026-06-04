import {
  type BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type Tool,
} from "@aws-sdk/client-bedrock-runtime";
import type { LlmTool } from "../tools/registry";

export type BedrockMessage = Message;

export type ToolUse = Readonly<{
  id: string;
  name: string;
  input: Record<string, unknown>;
}>;

export type AssistantTurnOutcome = Readonly<{
  stopReason: string | undefined;
  /** Visible assistant text for this model turn. */
  assistantText: string;
  toolUses: ToolUse[];
  /** Assistant message (content blocks) to append to the running history. */
  assistantMessage: Message;
}>;

function toBedrockTools(tools: readonly LlmTool[]): Tool[] {
  // AWS SDK models `Tool`/`ToolInputSchema` as Smithy discriminated unions, so an
  // object literal needs an explicit annotation to pick the right union member.
  return tools.map(
    (t): Tool => ({
      toolSpec: {
        name: t.function.name,
        description: t.function.description,
        // `json` is a Smithy DocumentType; the JSON-schema object is a valid document at runtime.
        inputSchema: { json: t.function.parameters as unknown as Record<string, never> },
      },
    }),
  );
}

export async function runAssistantTurn(params: Readonly<{
  client: BedrockRuntimeClient;
  modelId: string;
  systemPrompt: string;
  messages: Message[];
  tools: readonly LlmTool[];
}>): Promise<AssistantTurnOutcome> {
  const bedrockTools = toBedrockTools(params.tools);
  const response = await params.client.send(
    new ConverseCommand({
      modelId: params.modelId,
      system: [{ text: params.systemPrompt }],
      messages: params.messages,
      ...(bedrockTools.length > 0 ? { toolConfig: { tools: bedrockTools } } : {}),
      inferenceConfig: { maxTokens: 1024, temperature: 0.4 },
    }),
  );

  const content: ContentBlock[] = response.output?.message?.content ?? [];

  const toolUses: ToolUse[] = [];
  const textParts: string[] = [];
  for (const block of content) {
    if (block.text) {
      textParts.push(block.text);
    } else if (block.toolUse) {
      toolUses.push({
        id: block.toolUse.toolUseId ?? "",
        name: block.toolUse.name ?? "",
        input: (block.toolUse.input ?? {}) as Record<string, unknown>,
      });
    }
  }

  return {
    stopReason: response.stopReason,
    assistantText: textParts.join(" ").trim(),
    toolUses,
    assistantMessage: { role: "assistant", content },
  };
}

/** Build the `user` turn that returns tool results to the model. */
export function toolResultMessage(
  results: ReadonlyArray<{ toolUseId: string; output: string }>,
): Message {
  return {
    role: "user",
    content: results.map((r) => ({
      toolResult: {
        toolUseId: r.toolUseId,
        content: [{ text: r.output }],
      },
    })),
  };
}
