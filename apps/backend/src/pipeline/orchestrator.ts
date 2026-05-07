import type { VoiceSession } from "./session.ts";
import type { ILlmProvider } from "../types/provider.ts";
import type { SttCallbacks, TtsCallbacks } from "../types/provider.ts";
import type { ToolRegistry } from "../tools/registry.ts";
import type { AppConfig } from "../config.ts";
import { arrayBufferToBase64 } from "../utils/audio.ts";
import { createLogger } from "../logger.ts";

const log = createLogger("PIPELINE");

const TOOL_FILLER_MESSAGES = [
  "एक second, check करता हूँ…",
  "रुकिए, देखता हूँ…",
  "बस एक moment…",
];

/**
 * Wires all components together for a single voice session.
 *
 * Call this AFTER creating the VoiceSession.
 * It sets up the Socket.IO event handlers (audioChunk, disconnect).
 */
export function initializeSession(
  session: VoiceSession,
  llm: ILlmProvider,
  tools: ToolRegistry,
  config: AppConfig,
): void {
  const { socket } = session;

  // ── Socket.IO handlers ──
  socket.on("audioChunk", (data) => {
    if (!session.stt.isConnected) return;

    if (session.duration > config.maxAudioChunkDuration) {
      log.info({ duration: session.duration }, "Flushing — duration exceeded");
      session.stt.flush();
      socket.emit("transcript", session.dataBuffer);
      session.dataBuffer = "";
      if (session.timer) clearInterval(session.timer);
      session.duration = 0;
      session.timer = setInterval(() => {
        session.duration++;
      }, 1000);
    }

    session.transcribeCount++;
    session.stt.transcribe(arrayBufferToBase64(data));
  });

  socket.on("disconnect", () => {
    session.destroy();
    log.info("User disconnected");
  });
}

/**
 * Creates STT callbacks that drive the pipeline.
 * Must be called before creating the STT provider.
 * `getSession` is a getter because the session doesn't exist yet at callback creation time.
 */
export function createSttCallbacks(
  getSession: () => VoiceSession,
  llm: ILlmProvider,
  tools: ToolRegistry,
): SttCallbacks {
  return {
    onStartSpeech() {
      const session = getSession();
      if (session.timer) clearInterval(session.timer);

      // Barge-in: cancel active LLM+TTS pipeline
      if (session.isGenerating) {
        session.interruptedTranscript = session.lastPipelineTranscript;
        log.info(
          { savedTranscript: session.interruptedTranscript },
          "INTERRUPT — user spoke during AI response, cancelling pipeline",
        );

        session.interrupt();
        session.tts.close();
        session.socket.emit("stop-playback");

        // Pre-connect fresh TTS for next response
        session.tts.ensureConnected().catch((err) =>
          log.error({ err }, "Post-interrupt TTS pre-connect failed"),
        );
      }

      session.duration = 0;
      session.timer = setInterval(() => {
        session.duration++;
      }, 1000);
    },

    onEndSpeech() {
      const session = getSession();
      if (session.timer) clearInterval(session.timer);
      session.timer = null;
      session.duration = 0;
      session.endSpeechAt = performance.now();

      if (session.dataBuffer) {
        session.socket.emit("transcript", session.dataBuffer);
        session.dataBuffer = "";
      }
    },

    async onTranscript(transcript: string) {
      const session = getSession();
      session.dataBuffer += transcript;

      const pipelineStart = performance.now();
      log.info({ transcript }, "STT transcript received");

      if (!transcript.trim()) return;

      // Set up barge-in state
      session.isGenerating = true;
      const thisGenerationId = session.nextGeneration();
      session.lastPipelineTranscript = transcript;
      session.currentAbortController = new AbortController();
      session.socket.emit("generation-start", session.generationId);

      // Build user message with interrupted context
      let userMessage = transcript;
      if (session.interruptedTranscript) {
        userMessage = `[User previously said: "${session.interruptedTranscript}" (you were interrupted before finishing your response)]\n\nUser now says: ${transcript}`;
        log.info(
          { interruptedContext: session.interruptedTranscript },
          "Including interrupted context",
        );
        session.interruptedTranscript = "";
      }

      session.addMessage({ role: "user", content: userMessage });

      try {
        session.pipelineStartForTts = pipelineStart;
        session.audioChunkCount = 0;
        await session.tts.ensureConnected();

        await runLlmPipeline(session, llm, tools, thisGenerationId);
      } catch (err: any) {
        if (
          err.name === "AbortError" ||
          session.currentAbortController?.signal.aborted
        ) {
          log.info({ generationId: thisGenerationId }, "Generation aborted by barge-in");
        } else {
          log.error({ err, generationId: thisGenerationId }, "Pipeline error");
          if (thisGenerationId === session.generationId) {
            session.isGenerating = false;
            session.currentAbortController = null;
          }
        }
      }
    },

    onError(err: Error) {
      const session = getSession();
      log.error({ err }, "STT error");
      // Clean up timer (matches old behavior on STT socket close)
      if (session.timer) {
        clearInterval(session.timer);
        session.timer = null;
      }
      if (session.dataBuffer) {
        session.socket.emit("transcript", session.dataBuffer);
        session.dataBuffer = "";
      }
    },
  };
}

/**
 * Creates TTS callbacks for audio chunk relay and synthesis tracking.
 * `getSession` is a getter because the session doesn't exist yet.
 */
export function createTtsCallbacks(
  getSession: () => VoiceSession,
): TtsCallbacks {
  return {
    onAudioChunk(audioBase64: string) {
      const session = getSession();
      session.audioChunkCount++;

      if (session.audioChunkCount === 1) {
        const sincePipeline = (performance.now() - session.pipelineStartForTts).toFixed(0);
        log.info({ durationMs: sincePipeline }, "First audio chunk");
        if (session.endSpeechAt) {
          const ttfb = (performance.now() - session.endSpeechAt).toFixed(0);
          log.info({ ttfbMs: ttfb }, "TTFB from END_SPEECH to first audio byte");
        }
      }

      session.socket.emit("audio-chunk", {
        audio: audioBase64,
        generationId: session.generationId,
      });
    },

    onSynthesisComplete() {
      const session = getSession();
      const durationMs = (performance.now() - session.pipelineStartForTts).toFixed(0);
      log.info(
        { chunks: session.audioChunkCount, durationMs },
        "Synthesis complete",
      );

      // Only reset if no tool call loop is in progress
      if (!session.currentAbortController) {
        session.isGenerating = false;
      }
    },

    onError(err: Error) {
      log.error({ err }, "TTS error");
    },
  };
}

// ── Internal: LLM pipeline with tool call loop ──

async function runLlmPipeline(
  session: VoiceSession,
  llm: ILlmProvider,
  tools: ToolRegistry,
  thisGenerationId: number,
): Promise<void> {
  let pendingToolCalls = true;

  while (pendingToolCalls) {
    pendingToolCalls = false;
    if (thisGenerationId !== session.generationId) break;

    let ttsBuffer = "";
    let fillerSent = false;

    const result = await llm.streamCompletion({
      messages: [session.systemMessage, ...session.conversationHistory],
      tools: tools.getDefinitions(),
      abortSignal: session.currentAbortController!.signal,
      onToken: (token) => {
        if (thisGenerationId !== session.generationId) return;

        session.socket.emit("llm-token", token);
        ttsBuffer += token;

        // Send to TTS at sentence boundaries
        if (
          /[.!?,;:।]\s*$/.test(ttsBuffer) &&
          ttsBuffer.trim().length >= 20
        ) {
          const text = ttsBuffer.trim();
          log.info({ text }, "Sending TTS chunk");
          session.tts.convert(text);
          ttsBuffer = "";
        }
      },
      // Send filler to TTS immediately when first tool call delta arrives
      onToolCallDetected: () => {
        if (thisGenerationId !== session.generationId) return;
        const filler =
          TOOL_FILLER_MESSAGES[
            Math.floor(Math.random() * TOOL_FILLER_MESSAGES.length)
          ]!;
        log.info({ filler }, "Speaking TTS filler (early)");
        session.tts.convert(filler);
        session.tts.flush();
        fillerSent = true;
      },
    });

    // Handle tool calls
    if (
      result.finishReason === "tool_calls" &&
      result.toolCalls.length > 0 &&
      thisGenerationId === session.generationId
    ) {
      const toolNames = result.toolCalls.map(
        (t) => `${t.function.name}(${t.function.arguments})`,
      );
      log.info({ toolCalls: toolNames }, "LLM requested tool calls");

      session.addMessage({
        role: "assistant",
        content: result.assistantText || "",
        tool_calls: result.toolCalls,
      });

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        result.toolCalls.map(async (tc) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            log.error(
              { tool: tc.function.name, rawArgs: tc.function.arguments },
              "Failed to parse tool args",
            );
          }
          const execResult = await tools.execute(tc.function.name, args);
          return { tool_call_id: tc.id, result: execResult.result };
        }),
      );

      for (const tr of toolResults) {
        log.info({ toolCallId: tr.tool_call_id, result: tr.result }, "Tool result");
        session.addMessage({
          role: "tool",
          tool_call_id: tr.tool_call_id,
          content: tr.result,
        });
      }

      pendingToolCalls = true;
      continue;
    }

    // Normal text response
    if (result.assistantText) {
      session.addMessage({
        role: "assistant",
        content: result.assistantText,
      });
    }

    if (thisGenerationId === session.generationId) {
      if (result.tokenCount === 0) {
        log.info("No tokens received, skipping TTS");
        session.isGenerating = false;
        session.currentAbortController = null;
      } else {
        const remaining = ttsBuffer.trim();
        if (remaining) {
          log.info({ text: remaining }, "Sending final TTS chunk");
          session.tts.convert(remaining);
        }
        session.tts.flush();
        // Null out controller so TTS onSynthesisComplete can reset isGenerating
        session.currentAbortController = null;
        log.info("TTS flushed — waiting for audio chunks");
      }
    }
  }
}
