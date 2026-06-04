import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { isUsageCapEnforced } from "@streammeo/shared";
import type { AppConfig } from "../config";
import { getCorsOrigins } from "../config";
import { getStore } from "../db";
import { createLogger } from "../logger";
import {
  EmptyTranscriptError,
  runVoiceTurn,
  UsageCapError,
  type PipelineDeps,
} from "../pipeline/orchestrator";

const sessionSchema = z.object({
  apiKey: z.string().min(10),
});

const turnSchema = z.object({
  apiKey: z.string().min(10),
  sessionId: z.string().min(1),
  /** Base64-encoded 16 kHz, 16-bit, mono little-endian PCM. */
  audio: z.string().min(1),
});

/** Express app serving the serverless voice control + turn endpoints. */
export function createVoiceApp(deps: PipelineDeps): express.Express {
  const { config } = deps;
  const log = createLogger(config, "voice");
  const app = express();

  app.use(cors({ origin: getCorsOrigins(config), credentials: true }));
  app.use(express.json({ limit: "12mb" }));

  const router = express.Router();

  router.post("/session", async (req, res) => {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid session payload" });
      return;
    }

    const workspace = await getStore().workspaces.findByApiKey(parsed.data.apiKey);
    if (!workspace) {
      res.status(401).json({ error: "Unknown API key" });
      return;
    }
    if (
      isUsageCapEnforced(workspace.minutesLimit) &&
      workspace.minutesUsed >= workspace.minutesLimit
    ) {
      res.status(403).json({ error: "Voice minute cap reached for this workspace." });
      return;
    }

    const sessionId = randomUUID();
    await getStore().sessions.createForWorkspace(workspace.id, sessionId);
    log.info({ sessionId, workspaceId: workspace.id }, "voice session created");

    res.status(201).json({
      sessionId,
      workspaceId: workspace.id,
      minutesUsed: workspace.minutesUsed,
    });
  });

  router.post("/turn", async (req, res) => {
    const parsed = turnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid turn payload" });
      return;
    }

    const workspace = await getStore().workspaces.findByApiKey(parsed.data.apiKey);
    if (!workspace) {
      res.status(401).json({ error: "Unknown API key" });
      return;
    }

    const session = await getStore().sessions.findByIdAndWorkspace(
      parsed.data.sessionId,
      workspace.id,
    );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const pcm = Buffer.from(parsed.data.audio, "base64");
    if (pcm.length < 32) {
      res.status(400).json({ error: "No audio captured" });
      return;
    }

    try {
      const result = await runVoiceTurn(deps, {
        workspace,
        sessionId: parsed.data.sessionId,
        pcm,
      });
      const fresh = await getStore().workspaces.findById(workspace.id);
      res.json({ ok: true, ...result, minutesUsed: fresh?.minutesUsed ?? workspace.minutesUsed });
    } catch (err) {
      if (err instanceof UsageCapError || err instanceof EmptyTranscriptError) {
        res.status(err instanceof UsageCapError ? 403 : 422).json({ error: err.message });
        return;
      }
      log.error({ err, sessionId: parsed.data.sessionId }, "voice turn failed");
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.use("/api/v1/voice", router);
  return app;
}
