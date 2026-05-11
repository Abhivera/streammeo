import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { WorkspaceDTO } from "@streammeo/db";
import { isUsageCapEnforced } from "@streammeo/shared";
import { getStore } from "../db";
import { createLogger } from "../logger";
import { VoiceSession } from "../pipeline/session";
import { runPipeline, type PipelineDeps } from "../pipeline/orchestrator";

const joinSchema = z.object({
  apiKey: z.string().min(10),
});

const WS_RATE_WINDOW_MS = 60_000;
const WS_RATE_MAX_CONN = 10;
const wsConnHits = new Map<string, number[]>();

export function attachSocketHandlers(io: Server, deps: PipelineDeps): void {
  const log = createLogger(deps.config, "socket");

  io.engine.on("connection_error", (err) => log.error({ err }, "transport error"));

  io.use(async (socket, next) => {
    const header = socket.handshake.headers["x-forwarded-for"];
    const rawIp =
      (typeof header === "string"
        ? header.split(",")[0]?.trim()
        : Array.isArray(header)
          ? header[0]
          : "") || socket.handshake.address;

    const now = Date.now();
    const stamp = wsConnHits.get(rawIp ?? "unknown") ?? [];
    const recent = stamp.filter((t) => now - t < WS_RATE_WINDOW_MS);
    recent.push(now);
    wsConnHits.set(rawIp ?? "unknown", recent);

    if (recent.length > WS_RATE_MAX_CONN) {
      log.warn({ ip: rawIp }, "socket connection rate limited");
      next(new Error("too_many_connections"));
      return;
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    let voice: VoiceSession | null = null;
    let workspace: WorkspaceDTO | null = null;
    let pipelineBusy = false;

    socket.on("join", async (payload: unknown) => {
      const parsed = joinSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", { message: "Invalid join payload" });
        return;
      }

      try {
        workspace = await getStore().workspaces.findByApiKey(parsed.data.apiKey);

        if (!workspace) {
          socket.emit("error", { message: "Unknown API key" });
          return;
        }

        if (
          isUsageCapEnforced(workspace.minutesLimit) &&
          workspace.minutesUsed >= workspace.minutesLimit
        ) {
          socket.emit("error", {
            message: "Voice minute cap reached for this workspace.",
          });
          return;
        }

        const sessionId = randomUUID();
        await getStore().sessions.createForWorkspace(workspace.id, sessionId);

        voice = new VoiceSession({
          id: socket.id,
          workspaceId: workspace.id,
          dbSessionId: sessionId,
          socket,
        });

        voice.setState("idle");
        socket.emit("usage", {
          minutesUsed: workspace.minutesUsed,
        });
        log.info(
          {
            socketId: socket.id,
            sessionId,
            workspaceId: workspace.id,
          },
          "voice session joined",
        );
      } catch (err) {
        log.error({ err }, "join failed");
        socket.emit("error", { message: "Could not start session" });
      }
    });

    socket.on("audio", (chunk: unknown) => {
      const v = voice;
      if (!(v && workspace)) return;
      if (v.state === "processing") return;

      let buf: Buffer | null = null;
      if (chunk instanceof Buffer) buf = chunk;
      else if (chunk instanceof Uint8Array) buf = Buffer.from(chunk);
      else if (chunk instanceof ArrayBuffer) buf = Buffer.from(chunk);

      if (!(buf && buf.length > 0)) return;

      if (v.state === "speaking") {
        v.setBargein();
      }
      if (v.state !== "listening") {
        v.setState("listening");
      }
      v.appendAudio(buf);
    });

    socket.on("end", async () => {
      const v = voice;
      const wLatest = workspace
        ? await getStore().workspaces.findById(workspace.id)
        : null;
      const effectiveWorkspace = wLatest ?? workspace;

      if (!(v && effectiveWorkspace)) {
        socket.emit("error", { message: "Session not ready" });
        return;
      }
      if (pipelineBusy) return;
      pipelineBusy = true;

      try {
        await runPipeline(deps, v, effectiveWorkspace);
      } finally {
        pipelineBusy = false;
      }
    });

    socket.on("barge", () => {
      const v = voice;
      if (!(v && workspace)) return;
      v.setBargein();
    });

    socket.on("disconnect", async () => {
      log.info({ socketId: socket.id }, "disconnect");
      if (!voice?.dbSessionId) return;
      await getStore().sessions
        .markEndedIfOpen(voice.dbSessionId)
        .catch((err: unknown) => log.error({ err }, "session finalize on disconnect failed"));
    });
  });
}
