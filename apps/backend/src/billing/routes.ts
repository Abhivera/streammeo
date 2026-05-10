import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import Razorpay from "razorpay";
import type { AppConfig } from "../config";
import { getStore } from "../db";
import { createAuthMiddleware } from "../auth/middleware";
import { PLANS, type PlanId } from "@voicewidget/shared";
import { createLogger } from "../logger";

function verifyRazorpaySignature(
  body: Buffer,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!(signature && secret && secret.length > 8)) return false;
  const expectedHex = crypto.createHmac("sha256", secret).update(body).digest("hex");
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(expectedHex, "hex");
    b = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const createOrderSchema = z.object({
  planId: z.enum(["starter", "growth", "pro"]),
});

export type BillingWebhookBody = Record<string, unknown>;

export function createBillingWebhookRouter(config: AppConfig): Router {
  const router = Router();
  const log = createLogger(config, "billing-webhook");

  router.post("/", (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = req.get("x-razorpay-signature");
    const ok = verifyRazorpaySignature(
      raw,
      signature ?? undefined,
      config.RAZORPAY_WEBHOOK_SECRET ?? undefined,
    );
    if (!ok) {
      res.status(400).send("invalid signature");
      return;
    }

    void (async () => {
      try {
        const body = JSON.parse(raw.toString("utf8")) as BillingWebhookBody;
        const evt = typeof body.event === "string" ? body.event : "";
        if (!evt.startsWith("payment.") && evt !== "order.paid") {
          log.info({ evt }, "ignored webhook event");
          return;
        }

        const entity = extractOrderLike(body);
        if (!entity?.notes?.workspaceId || !entity?.notes?.planId) {
          log.warn({ body }, "webhook missing notes");
          return;
        }

        const wid = entity.notes.workspaceId;
        const planId = entity.notes.planId as PlanId;
        const limits = PLANS[planId];
        if (!(limits?.minutesLimit)) {
          log.error({ planId }, "unknown plan id in webhook notes");
          return;
        }

        await getStore().workspaces.update(wid, {
          plan: planId,
          minutesLimit: limits.minutesLimit,
        });
        log.info({ wid, planId }, "workspace plan updated via webhook");
      } catch (err) {
        log.error({ err }, "webhook processing failed");
      }
    })();

    res.json({ received: true });
  });

  return router;
}

function extractOrderLike(
  payload: BillingWebhookBody,
): { notes?: Record<string, string> } | null {
  const payment = nestedGet(payload, ["payload", "payment", "entity"]) as BillingWebhookBody | undefined;
  if (payment?.notes && typeof payment.notes === "object") return payment;

  const order = nestedGet(payload, ["payload", "order", "entity"]) as BillingWebhookBody | undefined;
  if (order?.notes && typeof order.notes === "object") return order;

  const entity =
    nestedGet(payload, ["payload", "payment_link", "entity"]) as BillingWebhookBody | undefined;
  if (entity?.notes && typeof entity.notes === "object") return entity;

  return null;
}

function nestedGet(root: BillingWebhookBody, path: readonly string[]): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function createBillingPublicRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/plans", (_req, res) => {
    res.json(PLANS);
  });

  return router;
}

export function createBillingOrderRouter(config: AppConfig): Router {
  const router = Router();
  const auth = createAuthMiddleware(config);
  const log = createLogger(config, "billing-order");

  router.use(auth);

  router.post("/create-order", async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (!(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET)) {
      res.status(501).json({ error: "Razorpay is not configured" });
      return;
    }

    const plan = PLANS[parsed.data.planId];
    const wid = req.auth!.workspaceId;

    const razorpay = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    });

    try {
      const order = await razorpay.orders.create({
        amount: plan.price,
        currency: "INR",
        receipt: `vw_${wid.slice(0, 8)}`,
        notes: {
          workspaceId: wid,
          planId: parsed.data.planId,
        },
      });

      res.json({
        id: order.id,
        currency: order.currency,
        amount: order.amount,
        key: config.RAZORPAY_KEY_ID,
        planId: parsed.data.planId,
      });
    } catch (err) {
      log.error({ err }, "create razorpay order failed");
      res.status(500).json({ error: "Unable to create order" });
    }
  });

  return router;
}
