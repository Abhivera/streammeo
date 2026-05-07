import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { SarvamAIClient } from "sarvamai";
import type { AppConfig } from "./config.ts";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  TypedSocket,
} from "./types/socket-events.ts";
import { SarvamSttProvider } from "./providers/stt/sarvam-stt.ts";
import { SarvamTtsProvider } from "./providers/tts/sarvam-tts.ts";
import { SarvamLlmProvider } from "./providers/llm/sarvam-llm.ts";
import { GroqLlmProvider } from "./providers/llm/groq-llm.ts";
import type { ILlmProvider } from "./types/provider.ts";
import { ToolRegistry } from "./tools/registry.ts";
import { getOrderStatusTool } from "./tools/get-order-status.ts";
import { createWebSearchTool } from "./tools/web-search.ts";
import { VoiceSession } from "./pipeline/session.ts";
import {
  initializeSession,
  createSttCallbacks,
  createTtsCallbacks,
} from "./pipeline/orchestrator.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("SERVER");

export function createAppServer(config: AppConfig) {
  const app = express();
  const server = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: config.corsOrigin },
  });

  // Shared Sarvam AI client
  const sarvamClient = new SarvamAIClient({
    apiSubscriptionKey: config.sarvam.apiKey,
  });

  // Shared tool registry
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(getOrderStatusTool);
  toolRegistry.register(createWebSearchTool(config.tavilyApiKey));

  // Shared LLM provider (stateless, safe to share across sessions)
  let llm: ILlmProvider;
  if (config.llmProvider === "groq") {
    llm = new GroqLlmProvider(config.groq);
    log.info({ model: config.groq.model }, "Using Groq LLM provider");
  } else {
    llm = new SarvamLlmProvider(sarvamClient, config.sarvam.llm);
    log.info({ model: config.sarvam.llm.model }, "Using Sarvam LLM provider");
  }

  app.get("/", (_req, res) => {
    res.send("<h1>Audio Agent Backend</h1>");
  });

  io.on("connection", async (socket: TypedSocket) => {
    log.info({ socketId: socket.id }, "User connected");

    // Late-bind pattern: session is assigned after provider creation
    let session!: VoiceSession;
    const getSession = () => session;

    // Create callbacks (they capture getSession, which returns session once assigned)
    const ttsCallbacks = createTtsCallbacks(getSession);
    const sttCallbacks = createSttCallbacks(getSession, llm, toolRegistry);

    // Create providers with callbacks
    const stt = new SarvamSttProvider(
      sarvamClient,
      config.sarvam.stt,
      sttCallbacks,
    );
    const tts = new SarvamTtsProvider(
      sarvamClient,
      config.sarvam.tts,
      ttsCallbacks,
    );

    // Create session (now getSession() will return this)
    session = new VoiceSession(socket, stt, tts);

    // Wire socket handlers
    initializeSession(session, llm, toolRegistry, config);

    // Pre-connect TTS so it's ready for first response
    tts.ensureConnected().catch((err) =>
      log.error({ err }, "TTS pre-connect failed"),
    );

    // Connect STT (starts listening for audio)
    await stt.connect();
  });

  return { server, io };
}
