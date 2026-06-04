import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { MessageDTO, SessionCursor, StreammeoStore } from "@streammeo/db";
import { z } from "zod";
import type { AppConfig } from "../config";
import { getStore } from "../db";
import { createAuthMiddleware } from "../auth/middleware";
import { createLogger } from "../logger";
import { testShopifyCredentials } from "../integrations/shopify";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.literal("en").optional(),
  agentName: z.string().min(1).optional(),
  systemPrompt: z.string().min(1).optional(),
});

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const shopifySchema = z.object({
  shopDomain: z.string().min(3),
  accessToken: z.string().min(10),
});

function decodeCursor(q: unknown): SessionCursor | undefined {
  if (typeof q !== "string" || !q) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(q, "base64url").toString("utf8"));
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "startedAt" in parsed &&
      "id" in parsed
    ) {
      const c = parsed as { startedAt: unknown; id: unknown };
      if (typeof c.startedAt === "number" && typeof c.id === "string") {
        return { startedAt: c.startedAt, id: c.id };
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function encodeCursor(key: SessionCursor): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

export function createWorkspaceRouter(config: AppConfig): Router {
  const router = Router();
  router.use(createAuthMiddleware(config));
  const log = createLogger(config, "workspace");
  const store = (): StreammeoStore => getStore();

  router.get("/", async (req, res) => {
    const ws = await store().workspaces.findById(req.auth!.workspaceId);
    if (!ws) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    res.json(ws);
  });

  router.patch("/", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const next = await store().workspaces.update(wid, parsed.data);
    if (!next) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    res.json(next);
  });

  router.get("/sessions", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const limit = Math.min(Number(req.query.limit ?? "20"), 100);

    const workspace = await store().workspaces.findById(wid);
    const total = workspace?.sessionCount ?? 0;

    const startKey =
      typeof req.query.cursor === "string" && req.query.cursor
        ? decodeCursor(req.query.cursor)
        : undefined;

    const { items: rows, nextKey } = await store().sessions.listByWorkspacePage(
      wid,
      limit,
      startKey,
    );

    res.json({
      data: rows.map((s) => ({
        id: s.id,
        workspaceId: s.workspaceId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSec: s.durationSec,
        resolved: s.resolved,
        messageCount: s.messageCount,
      })),
      limit,
      total,
      ...(nextKey ? { nextCursor: encodeCursor(nextKey) } : {}),
    });
  });

  router.get("/sessions/:id", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const sessionId = req.params.id ?? "";
    const session = await store().sessions.findByIdAndWorkspace(sessionId, wid);
    if (!session) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [transcript, toolCalls] = await Promise.all([
      store().listMessagesForSessionAsc(session.id),
      store().toolCalls.listForSessionAscending(session.id),
    ]);

    res.json({ ...session, transcript, toolCalls });
  });

  router.get("/analytics", async (req, res) => {
    const wid = req.auth!.workspaceId;

    const now = new Date();
    const startOfDayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startDayMs = startOfDayUtc;
    const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const ws = await store().workspaces.findById(wid);
    const allSessions = await store().sessions.listAllByWorkspace(wid);

    let totalCalls = 0;
    let resolvedCalls = 0;
    let todayCalls = 0;
    let weekCalls = 0;
    let durSum = 0;

    for (const s of allSessions) {
      totalCalls++;
      if (s.resolved) resolvedCalls++;
      const t = Date.parse(s.startedAt);
      if (!Number.isNaN(t)) {
        if (t >= startDayMs) todayCalls++;
        if (t >= weekAgoMs) weekCalls++;
      }
      durSum += s.durationSec;
    }

    const rawMsgs = await store().recentMessagesForWorkspace(wid, 500);
    const userMsgs = rawMsgs.filter((m: MessageDTO) => m.role === "user");

    const counts = new Map<string, number>();
    for (const m of userMsgs) {
      const key = m.text.trim().slice(0, 120);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const topQuestions = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));

    const avgDurationSec =
      totalCalls > 0 ? Math.round(durSum / totalCalls) : 0;

    res.json({
      totalCalls,
      resolvedCalls,
      callsToday: todayCalls,
      callsThisWeek: weekCalls,
      avgDurationSec,
      resolutionRate: totalCalls
        ? Math.round((resolvedCalls / totalCalls) * 100)
        : 0,
      topQuestions,
      minutesUsed: ws?.minutesUsed ?? 0,
    });
  });

  router.post("/faq", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const parsed = faqSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const row = await store().faqs.put({
      workspaceId: wid,
      id: randomUUID(),
      question: parsed.data.question,
      answer: parsed.data.answer,
      embedding: [],
      createdAtMs: Date.now(),
    });
    res.status(201).json(row);
  });

  router.get("/faq", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const list = await store().faqs.listByWorkspaceDescending(wid);
    res.json(list);
  });

  router.delete("/faq/:id", async (req, res) => {
    const wid = req.auth!.workspaceId;
    try {
      const ok = await store().faqs.delete(wid, req.params.id ?? "");
      if (!ok) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.status(204).send();
    } catch (err) {
      log.error({ err }, "faq delete failed");
      res.status(500).json({ error: "Delete failed" });
    }
  });

  router.patch("/faq/:id", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const parsed = faqSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const row = await store().faqs.update(wid, req.params.id ?? "", {
      question: parsed.data.question,
      answer: parsed.data.answer,
    });
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  });

  router.post("/integrations/shopify", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const parsed = shopifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    let domain = parsed.data.shopDomain.trim();
    domain = domain.replace(/^https?:\/\//iu, "").replace(/\/+$/u, "");

    const ok = await testShopifyCredentials(domain, parsed.data.accessToken);
    if (!ok) {
      res.status(400).json({ error: "Shopify credentials failed validation" });
      return;
    }

    const ws = await store().workspaces.update(wid, {
      shopifyShopDomain: domain,
      shopifyAccessToken: parsed.data.accessToken,
    });
    res.json({
      ok: true,
      shopDomain: ws?.shopifyShopDomain ?? domain,
    });
  });

  router.get("/integrations/shopify", async (req, res) => {
    const wid = req.auth!.workspaceId;
    const ws = await store().workspaces.findById(wid);
    const domain = ws?.shopifyShopDomain;
    const token = ws?.shopifyAccessToken;

    res.json({
      configured: !!(domain && token),
      connected:
        !!(domain &&
          token &&
          (await testShopifyCredentials(domain, token))),
    });
  });

  return router;
}
