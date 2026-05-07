import type { SarvamAIClient } from "sarvamai";
import type { ISttProvider, SttCallbacks } from "./stt.interface.ts";
import type { SarvamSttConfig } from "../../config.ts";
import { createLogger } from "../../logger.ts";

const log = createLogger("STT");

type SttSocket = Awaited<ReturnType<SarvamAIClient["speechToTextStreaming"]["connect"]>>;

export class SarvamSttProvider implements ISttProvider {
  private socket: SttSocket | null = null;
  private transcribeCount = 0;

  constructor(
    private client: SarvamAIClient,
    private config: SarvamSttConfig,
    private callbacks: SttCallbacks,
  ) {}

  get isConnected(): boolean {
    return this.socket?.readyState === 1;
  }

  async connect(): Promise<void> {
    const stt = await this.client.speechToTextStreaming.connect({
      model: this.config.model,
      mode: this.config.mode,
      "language-code": this.config.languageCode,
      sample_rate: this.config.sampleRate,
      input_audio_codec: this.config.inputAudioCodec,
      vad_signals: "true",
    } as any);

    stt.on("message", (message: any) => this.handleMessage(message));

    stt.on("error", (err: any) => {
      log.error(
        { err, transcribeCount: this.transcribeCount },
        "Socket error",
      );
      this.callbacks.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
    });

    stt.on("close", (event: { code?: number; reason?: string }) => {
      log.error(
        { code: event?.code, reason: event?.reason, transcribeCount: this.transcribeCount },
        "Socket closed",
      );
      this.socket = null;
      this.transcribeCount = 0;

      // Flush any buffered transcript on close (matches old behavior)
      this.callbacks.onError(new Error("STT socket closed"));

      // Auto-reconnect
      log.info("Reconnecting...");
      this.connect()
        .then(() => log.info("Reconnected successfully"))
        .catch((err) => log.error({ err }, "Reconnect failed"));
    });

    this.socket = stt;
    log.info("Connected");
  }

  transcribe(audioBase64: string): void {
    if (!this.socket || this.socket.readyState !== 1) return;
    this.transcribeCount++;
    this.socket.transcribe({
      audio: audioBase64,
      sample_rate: parseInt(this.config.sampleRate, 10),
      encoding: "audio/wav",
    });
  }

  flush(): void {
    this.socket?.flush();
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }

  private handleMessage(message: any): void {
    if (message.type === "events") {
      const eventData = message.data as { signal_type: string };
      if (eventData.signal_type === "START_SPEECH") {
        this.callbacks.onStartSpeech();
      } else if (eventData.signal_type === "END_SPEECH") {
        log.info("END_SPEECH detected");
        this.callbacks.onEndSpeech();
      }
    } else if (message.type === "data") {
      const transcriptData = message.data as { transcript: string };
      this.callbacks.onTranscript(transcriptData.transcript);
    }
  }
}
