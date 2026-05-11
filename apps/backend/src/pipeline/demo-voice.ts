import { randomUUID } from "node:crypto";
import type { WorkspaceDTO } from "@streammeo/db";
import type { VoiceSession } from "./session";
import { wavChunks } from "./tts";
import { silentWavPcm16Mono } from "./demo-wav";
import type { PipelineDeps } from "./deps";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { usageRedisKey } from "../redis";

const DEMO_USER_TEXT =
  "(Demo) Where is my order VW-1001? I placed it last week.";

const DEMO_ASSISTANT_TEXT =
  "This is a demo reply — no speech APIs were called. Order VW-1001 has shipped via DHL. Tracking number JD0146000058290401. ETA two to three business days. How else can I help?";

export async function runDemoVoicePipeline(
  deps: PipelineDeps,
  session: VoiceSession,
  workspace: WorkspaceDTO,
  wallStart: number,
  signal: AbortSignal,
): Promise<void> {
  const log = createLogger(deps.config, "pipeline-demo");
  const userText = DEMO_USER_TEXT;
  const assistantText = DEMO_ASSISTANT_TEXT;

  log.info({ sessionId: session.dbSessionId }, "demo voice pipeline (no STT/LLM/TTS)");

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

  session.setState("speaking");
  if (signal.aborted) {
    session.setState("listening");
    return;
  }

  const audioBuf = silentWavPcm16Mono(22_050, 0.5);
  for (const chunk of wavChunks(audioBuf)) {
    if (signal.aborted) break;
    session.socket.emit("audio", chunk);
  }

  session.socket.emit("transcript", { role: "assistant", text: assistantText });

  const asstMsgId = randomUUID();
  await data.messages.put({
    id: asstMsgId,
    sessionId: session.dbSessionId,
    workspaceId: workspace.id,
    role: "assistant",
    text: assistantText,
    audioUrl: null,
    createdAtMs: Date.now(),
  });
  await data.sessions.addMessageCount(session.dbSessionId, 1);
  session.conversation.push({ role: "assistant", text: assistantText });
  session.llmTurns.push({
    role: "assistant",
    content: assistantText,
  });

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
}
