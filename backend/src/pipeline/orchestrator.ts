import { randomUUID } from "node:crypto";
import type { Message } from "@aws-sdk/client-bedrock-runtime";
import type { WorkspaceDTO } from "@streammeo/db";
import { isUsageCapEnforced } from "@streammeo/shared";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { publishSessionState, publishVoiceEvent } from "../realtime/appsync";
import { runAssistantTurn, toolResultMessage } from "./llm";
import { transcribePcm } from "./stt";
import { synthesiseToUrl } from "./tts";
import type { PipelineDeps } from "./deps";

export type { PipelineDeps } from "./deps";

const MAX_TOOL_LOOPS = 8;
const HISTORY_LIMIT = 12;

export class UsageCapError extends Error {
  constructor() {
    super("Voice minute cap reached for this workspace.");
    this.name = "UsageCapError";
  }
}

export class EmptyTranscriptError extends Error {
  constructor() {
    super(
      "We couldn't make out any words. Try again, a bit closer to the mic or a little louder.",
    );
    this.name = "EmptyTranscriptError";
  }
}

export type VoiceTurnResult = Readonly<{
  userText: string;
  assistantText: string;
  audioUrl: string;
}>;

function systemPrompt(workspace: WorkspaceDTO): string {
  return `${workspace.systemPrompt}\n\nYou are ${workspace.agentName}. Keep answers short and speakable (2–4 sentences). Do not use markdown or bullet lists.`;
}

/**
 * Build a strictly alternating user/assistant history that Bedrock's Converse
 * API accepts: starts with `user`, no repeats, and ends with `assistant` so the
 * caller can append the new user turn.
 */
async function loadHistory(sessionId: string): Promise<Message[]> {
  const rows = await getStore().listMessagesForSessionAsc(sessionId);
  const out: Message[] = [];
  let expected: "user" | "assistant" = "user";
  for (const m of rows) {
    if (m.role !== expected || !m.text.trim()) continue;
    out.push({ role: expected, content: [{ text: m.text }] });
    expected = expected === "user" ? "assistant" : "user";
  }
  // Drop a trailing user turn so the new user message we append still alternates.
  if (out.length > 0 && out[out.length - 1]!.role === "user") {
    out.pop();
  }
  return out.slice(-HISTORY_LIMIT);
}

/**
 * Run one full voice turn: STT (Transcribe) → LLM + tools (Bedrock) → TTS
 * (Polly + S3). Persists messages/tool calls, fans out transcript/state events
 * to AppSync, and returns the rendered result for the HTTP response.
 */
export async function runVoiceTurn(
  deps: PipelineDeps,
  params: Readonly<{ workspace: WorkspaceDTO; sessionId: string; pcm: Buffer }>,
): Promise<VoiceTurnResult> {
  const { workspace, sessionId, pcm } = params;
  const log = createLogger(deps.config, "pipeline");
  const data = getStore();
  const wallStart = Date.now();

  if (
    isUsageCapEnforced(workspace.minutesLimit) &&
    workspace.minutesUsed >= workspace.minutesLimit
  ) {
    throw new UsageCapError();
  }

  await publishSessionState(deps.config, {
    workspaceId: workspace.id,
    sessionId,
    state: "processing",
  });

  log.info({ sessionId, bytes: pcm.length }, "STT start");
  const userText = await transcribePcm(
    deps.transcribe,
    pcm,
    deps.config.TRANSCRIBE_LANGUAGE_CODE,
  );
  log.info({ sessionId, userText }, "STT done");

  if (!userText) {
    await publishSessionState(deps.config, {
      workspaceId: workspace.id,
      sessionId,
      state: "idle",
    });
    throw new EmptyTranscriptError();
  }

  await publishVoiceEvent(deps.config, {
    workspaceId: workspace.id,
    sessionId,
    role: "user",
    text: userText,
    audioUrl: null,
  });
  await data.messages.put({
    id: randomUUID(),
    sessionId,
    workspaceId: workspace.id,
    role: "user",
    text: userText,
    audioUrl: null,
    createdAtMs: Date.now(),
  });
  await data.sessions.addMessageCount(sessionId, 1);

  const history = await loadHistory(sessionId);
  const messages: Message[] = [...history, { role: "user", content: [{ text: userText }] }];

  const toolRegistry = deps.tools;
  const ctx = { workspaceId: workspace.id };
  let finalAssistantText = "";

  for (let turn = 0; turn < MAX_TOOL_LOOPS; turn++) {
    log.info({ sessionId, turn }, "LLM turn start");
    const outcome = await runAssistantTurn({
      client: deps.bedrock,
      modelId: deps.config.BEDROCK_MODEL_ID,
      systemPrompt: systemPrompt(workspace),
      messages,
      tools: toolRegistry.getTools(),
    });
    log.info({ sessionId, stopReason: outcome.stopReason }, "LLM turn done");

    messages.push(outcome.assistantMessage);

    if (outcome.toolUses.length === 0) {
      finalAssistantText = outcome.assistantText;
      break;
    }

    const results: Array<{ toolUseId: string; output: string }> = [];
    for (const tu of outcome.toolUses) {
      const outputText = await toolRegistry.execute(tu.name, tu.input, ctx);
      await data.toolCalls.put({
        id: randomUUID(),
        sessionId,
        toolName: tu.name,
        input: tu.input,
        output: { result: outputText },
        createdAtMs: Date.now(),
      });
      results.push({ toolUseId: tu.id, output: outputText });
    }
    messages.push(toolResultMessage(results));

    if (turn === MAX_TOOL_LOOPS - 1) {
      log.warn({ sessionId }, "tool loop cap reached");
      finalAssistantText =
        "I'm having trouble finishing that lookup. Please try again in a moment.";
    }
  }

  if (!finalAssistantText.trim()) {
    finalAssistantText = "I'm sorry, I couldn't find an answer just now.";
  }

  await publishSessionState(deps.config, {
    workspaceId: workspace.id,
    sessionId,
    state: "speaking",
  });

  log.info({ sessionId }, "TTS start");
  const audioUrl = await synthesiseToUrl(deps, finalAssistantText);
  log.info({ sessionId }, "TTS done");

  await publishVoiceEvent(deps.config, {
    workspaceId: workspace.id,
    sessionId,
    role: "assistant",
    text: finalAssistantText,
    audioUrl,
  });
  await data.messages.put({
    id: randomUUID(),
    sessionId,
    workspaceId: workspace.id,
    role: "assistant",
    text: finalAssistantText,
    audioUrl,
    createdAtMs: Date.now(),
  });
  await data.sessions.addMessageCount(sessionId, 1);

  const durationSec = Math.max(0, Math.round((Date.now() - wallStart) / 1000));
  const minuteDelta = Math.ceil(durationSec / 60);
  await data.finalizeVoiceTurn({
    sessionId,
    workspaceId: workspace.id,
    endedAt: new Date().toISOString(),
    durationSec,
    minuteDelta,
  });

  await publishSessionState(deps.config, {
    workspaceId: workspace.id,
    sessionId,
    state: "idle",
  });

  return { userText, assistantText: finalAssistantText, audioUrl };
}
