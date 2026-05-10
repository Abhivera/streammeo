import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import type { WorkspaceDTO } from "@voicewidget/db";
import { transcribe } from "./stt";
import { synthesise, wavChunks } from "./tts";
import type { VoiceSession } from "./session";
import { runAssistantStreamingTurn } from "./llm";
import type { ToolRegistry } from "../tools/registry";
import type { AppConfig } from "../config";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { workspaceLangToSarvam } from "../lang-map";
import { usageRedisKey } from "../redis";

export type PipelineDeps = Readonly<{
  config: AppConfig;
  tools: ToolRegistry;
  redis: Redis;
  anthropic: Anthropic;
}>;

const MAX_TOOL_LOOPS = 8;

export async function runPipeline(
  deps: PipelineDeps,
  session: VoiceSession,
  workspace: WorkspaceDTO,
): Promise<void> {
  const log = createLogger(deps.config, "pipeline");
  const locale = workspaceLangToSarvam(workspace.language);

  const wallStart = Date.now();

  try {
    if (workspace.minutesUsed >= workspace.minutesLimit) {
      session.socket.emit("error", {
        message: "Monthly limit reached. Please upgrade.",
      });
      session.setState("idle");
      return;
    }

    session.setState("processing");
    session.abortController = new AbortController();
    const signal = session.abortController.signal;

    const combined = Buffer.concat(session.audioBuffer);
    session.clearAudio();

    if (combined.length < 32) {
      session.socket.emit("error", { message: "No audio captured" });
      session.setState("idle");
      return;
    }

    log.info({ sessionId: session.dbSessionId }, "STT start");
    const userText = await transcribe(combined, deps.config.SARVAM_API_KEY, locale);
    log.info({ sessionId: session.dbSessionId, userText }, "STT done");

    session.socket.emit("transcript", { role: "user", text: userText });

    const data = getStore();
    const userMsgId = randomUUID();
    await data.messages.put({
      id: userMsgId,
      sessionId: session.dbSessionId,
      workspaceId: workspace.id,
      role: "user",
      text: userText,
      audioUrl: null,
      createdAtMs: Date.now(),
    });
    await data.sessions.addMessageCount(session.dbSessionId, 1);

    session.conversation.push({ role: "user", text: userText });
    session.anthropicTurns.push({ role: "user", content: userText });

    const toolRegistry = deps.tools;
    const ctx = { workspaceId: workspace.id };

    let finalAssistantText = "";

    for (let turn = 0; turn < MAX_TOOL_LOOPS; turn++) {
      if (signal.aborted) {
        session.setState("listening");
        return;
      }

      log.info({ sessionId: session.dbSessionId, turn }, "LLM turn start");
      const outcome = await runAssistantStreamingTurn({
        client: deps.anthropic,
        systemPrompt: session.getSystemPrompt(workspace),
        messages: session.anthropicTurns,
        tools: toolRegistry.getAnthropicTools(),
        abortSignal: signal,
      });
      log.info(
        { sessionId: session.dbSessionId, stopReason: outcome.stopReason },
        "LLM turn done",
      );

      session.anthropicTurns.push({
        role: "assistant",
        content: outcome.assistantContent as ContentBlockParam[],
      });

      if (outcome.toolUses.length === 0) {
        finalAssistantText = outcome.assistantText;
        break;
      }

      const toolResultBlocks: ContentBlockParam[] = [];
      for (const tu of outcome.toolUses) {
        const outputText = await toolRegistry.execute(tu.name, tu.input, ctx);
        await data.toolCalls.put({
          id: randomUUID(),
          sessionId: session.dbSessionId,
          toolName: tu.name,
          input: tu.input as Record<string, unknown>,
          output: { result: outputText },
          createdAtMs: Date.now(),
        });
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: outputText,
        });
      }

      session.anthropicTurns.push({
        role: "user",
        content: toolResultBlocks,
      });

      if (turn === MAX_TOOL_LOOPS - 1) {
        log.warn({ sessionId: session.dbSessionId }, "tool loop cap reached");
        finalAssistantText =
          "I'm having trouble finishing that lookup. Please try again in a moment.";
        break;
      }
    }

    if (!finalAssistantText.trim()) {
      finalAssistantText = "I'm sorry, I couldn't find an answer just now.";
    }

    session.setState("speaking");

    if (signal.aborted) {
      session.setState("listening");
      return;
    }

    log.info({ sessionId: session.dbSessionId }, "TTS start");
    const audioBuf = await synthesise(
      finalAssistantText,
      deps.config.SARVAM_API_KEY,
      locale,
      signal,
    );
    log.info(
      { sessionId: session.dbSessionId, bytes: audioBuf.length },
      "TTS done",
    );

    for (const chunk of wavChunks(audioBuf)) {
      if (signal.aborted) break;
      session.socket.emit("audio", chunk);
    }

    session.socket.emit("transcript", { role: "assistant", text: finalAssistantText });

    const asstMsgId = randomUUID();
    await data.messages.put({
      id: asstMsgId,
      sessionId: session.dbSessionId,
      workspaceId: workspace.id,
      role: "assistant",
      text: finalAssistantText,
      audioUrl: null,
      createdAtMs: Date.now(),
    });
    await data.sessions.addMessageCount(session.dbSessionId, 1);

    session.conversation.push({ role: "assistant", text: finalAssistantText });

    const durationSec = Math.max(0, Math.round((Date.now() - wallStart) / 1000));
    const minuteDelta = Math.ceil(durationSec / 60);

    const fresh = await data.finalizeVoiceTurn({
      sessionId: session.dbSessionId,
      workspaceId: workspace.id,
      endedAt: new Date().toISOString(),
      durationSec,
      minuteDelta,
    });

    await deps.redis
      .incrby(usageRedisKey(workspace.id), durationSec)
      .catch((err: unknown) => log.error({ err }, "redis usage increment failed"));

    session.socket.emit("usage", {
      minutesUsed: fresh?.minutesUsed ?? workspace.minutesUsed + minuteDelta,
      minutesLimit: fresh?.minutesLimit ?? workspace.minutesLimit,
    });

    session.abortController = null;
    session.setState("idle");
  } catch (err) {
    log.error({ err, sessionId: session.dbSessionId }, "pipeline error");
    const message =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    session.socket.emit("error", { message });
    session.abortController = null;
    session.setState("idle");
  }
}
