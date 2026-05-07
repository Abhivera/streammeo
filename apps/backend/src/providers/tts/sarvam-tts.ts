import type { SarvamAIClient } from "sarvamai";
import type { ITtsProvider, TtsCallbacks } from "./tts.interface.ts";
import type { SarvamTtsConfig } from "../../config.ts";
import { createLogger } from "../../logger.ts";

const log = createLogger("TTS");

type TtsSocket = Awaited<ReturnType<SarvamAIClient["textToSpeechStreaming"]["connect"]>>;

export class SarvamTtsProvider implements ITtsProvider {
  private socket: TtsSocket | null = null;
  // Monotonic ID — bumped on every close() and doConnect().
  // Prevents stale handlers and discards connections started before a close().
  private socketGeneration = 0;
  // Pending connection promise to prevent double-connect race
  private connectingPromise: Promise<void> | null = null;

  constructor(
    private client: SarvamAIClient,
    private config: SarvamTtsConfig,
    private callbacks: TtsCallbacks,
  ) {}

  async ensureConnected(): Promise<void> {
    if (this.socket) return;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = this.doConnect();
    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    const generation = ++this.socketGeneration;
    const start = performance.now();

    const newSocket = await this.client.textToSpeechStreaming.connect({
      model: this.config.model,
      send_completion_event: "true",
    } as any);
    await newSocket.waitForOpen();

    // If close() was called while we were connecting, discard this socket
    if (generation !== this.socketGeneration) {
      newSocket.close();
      log.info("Discarded stale TTS connection");
      return;
    }

    log.info({ durationMs: (performance.now() - start).toFixed(0) }, "WebSocket connected");

    newSocket.configureConnection({
      target_language_code: this.config.targetLanguageCode,
      speaker: this.config.speaker,
      pace: this.config.pace,
      output_audio_codec: this.config.outputAudioCodec,
      min_buffer_size: this.config.minBufferSize,
      output_audio_bitrate: this.config.outputAudioBitrate,
    } as any);

    newSocket.on("message", (message: any) => {
      if (generation !== this.socketGeneration) return;
      this.handleMessage(message);
    });

    newSocket.on("error", (err: any) => {
      if (generation !== this.socketGeneration) return;
      log.error({ err }, "Socket error");
      this.callbacks.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
    });

    newSocket.on("close", () => {
      if (generation !== this.socketGeneration) return;
      log.info("WebSocket closed, will reconnect on next use");
      this.socket = null;
    });

    this.socket = newSocket;
  }

  convert(text: string): void {
    this.socket?.convert(text);
  }

  flush(): void {
    this.socket?.flush();
  }

  close(): void {
    // Always bump generation — invalidates in-flight doConnect() AND stale handlers
    this.socketGeneration++;
    this.connectingPromise = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private handleMessage(message: any): void {
    if (message.type === "audio") {
      this.callbacks.onAudioChunk(message.data.audio);
    } else if (
      message.type === "event" &&
      message.data?.event_type === "final"
    ) {
      this.callbacks.onSynthesisComplete();
    } else {
      log.debug({ type: message.type, data: message.data }, "Unhandled message");
    }
  }
}
