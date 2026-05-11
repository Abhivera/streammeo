import { randomUUID } from "node:crypto";
import type { WorkspaceDTO } from "@streammeo/db";
import { transcribe } from "./stt";
import { synthesise, wavChunks } from "./tts";
import type { VoiceSession } from "./session";
import { runAssistantStreamingTurn } from "./llm";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { workspaceLangToDeepgramStt } from "../lang-map";
import { usageRedisKey } from "../redis";
import { isUsageCapEnforced } from "@streammeo/shared";
import { runDemoVoicePipeline } from "./demo-voice";
import type { PipelineDeps } from "./deps";

export type { PipelineDeps } from "./deps";

const MAX_TOOL_LOOPS = 8;

function isUserAbort(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: unknown; message?: unknown };
  if (e.name === "AbortError") return true;
  if (e.code === 20) return true;
  if (typeof e.message === "string" && /aborted/i.test(e.message)) return true;
  return false;
}

export async function runPipeline(
  deps: PipelineDeps,
  session: VoiceSession,
  workspace: WorkspaceDTO,
): Promise<void> {
  const log = createLogger(deps.config, "pipeline");
  const sttLanguage = workspaceLangToDeepgramStt(workspace.language);

  const wallStart = Date.now();

  try {
    if (
      isUsageCapEnforced(workspace.minutesLimit) &&
      workspace.minutesUsed >= workspace.minutesLimit
    ) {
      session.socket.emit("error", {
        message: "Voice minute cap reached for this workspace.",
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

    if (deps.config.demoMode) {
      await runDemoVoicePipeline(deps, session, workspace, wallStart, signal);
      session.abortController = null;
      session.setState("idle");
      return;
    }

    log.info({ sessionId: session.dbSessionId }, "STT start");
    const userText = await transcribe(
      combined,
      deps.config.DEEPGRAM_API_KEY,
      sttLanguage,
      deps.config.DEEPGRAM_STT_MODEL,
    );
    log.info({ sessionId: session.dbSessionId, userText }, "STT done");

    if (!userText.trim()) {
      log.warn({ sessionId: session.dbSessionId }, "STT empty transcript");
      session.socket.emit("error", {
        message:
          "We couldn't make out any words. Try again, a bit closer to the mic or a little louder.",
      });
      session.abortController = null;
      session.setState("idle");
      return;
    }

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
    session.llmTurns.push({ role: "user", content: userText });

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
        client: deps.groq,
        systemPrompt: session.getSystemPrompt(workspace),
        messages: session.llmTurns,
        tools: toolRegistry.getTools(),
        abortSignal: signal,
      });
      log.info(
        { sessionId: session.dbSessionId, stopReason: outcome.stopReason },
        "LLM turn done",
      );

      session.llmTurns.push(outcome.assistantMessage);

      if (outcome.toolUses.length === 0) {
        finalAssistantText = outcome.assistantText;
        break;
      }

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
        session.llmTurns.push({
          role: "tool",
          tool_call_id: tu.id,
          content: outputText,
        });
      }

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
    let audioBuf: Buffer;
    try {
      audioBuf = await synthesise(
        finalAssistantText,
        deps.config.DEEPGRAM_API_KEY,
        deps.config.DEEPGRAM_TTS_MODEL,
        signal,
      );
    } catch (ttsErr) {
      if (isUserAbort(ttsErr)) {
        log.info({ sessionId: session.dbSessionId }, "TTS aborted (barge-in)");
        session.abortController = null;
        return;
      }
      throw ttsErr;
    }
    log.info(
      { sessionId: session.dbSessionId, bytes: audioBuf.length },
      "TTS done",
    );

    for (const chunk of wavChunks(audioBuf)) {
      if (signal.aborted) break;
      session.socket.emit("audio", chunk);
    }

    if (signal.aborted) {
      log.info({ sessionId: session.dbSessionId }, "playback aborted after TTS fetch");
      session.abortController = null;
      return;
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
    });

    session.abortController = null;
    session.setState("idle");
  } catch (err) {
    if (isUserAbort(err)) {
      log.info({ sessionId: session.dbSessionId }, "pipeline aborted (barge-in)");
      session.abortController = null;
      if (session.state !== "listening") {
        session.setState("idle");
      }
      return;
    }
    log.error({ err, sessionId: session.dbSessionId }, "pipeline error");
    const message =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    session.socket.emit("error", { message });
    session.abortController = null;
    session.setState("idle");
  }
}
