import { z } from "zod";
import type { AppConfig } from "../config.js";
import {
  applyPlanUpgrade,
  razorpayFetch,
  verifyRazorpayWebhookSignature,
  type RazorpayOrder,
} from "../billing/service.js";
import { PLANS, type PlanId } from "@streammeo/shared";
import { publishBillingEvent } from "../realtime/appsync.js";

const razorpayWebhookSchema = z.object({
  event: z.string().optional(),
  payload: z
    .object({
      payment: z.object({ entity: z.object({ order_id: z.string().optional() }).optional() }).optional(),
      order: z.object({ entity: z.object({ id: z.string().optional() }).optional() }).optional(),
    })
    .optional(),
});

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handleBillingWebhook(
  config: AppConfig,
  rawBody: string,
  parsedBody: unknown,
  signature: string | undefined,
): Promise<WebhookResult> {
  if (config.RAZORPAY_WEBHOOK_SECRET && signature) {
    const valid = verifyRazorpayWebhookSignature(
      rawBody,
      signature,
      config.RAZORPAY_WEBHOOK_SECRET,
    );
    if (!valid) {
      return { status: 400, body: { error: "Invalid webhook signature" } };
    }
  }

  const payload = razorpayWebhookSchema.safeParse(parsedBody);
  if (!payload.success) {
    return { status: 400, body: { error: "Invalid payload" } };
  }

  if (payload.data.event !== "payment.captured") {
    return { status: 200, body: { received: true, ignored: true } };
  }

  const orderId =
    payload.data.payload?.payment?.entity?.order_id ??
    payload.data.payload?.order?.entity?.id;

  if (!orderId || !config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
    return { status: 200, body: { received: true } };
  }

  const orderRes = await razorpayFetch(
    config.RAZORPAY_KEY_ID,
    config.RAZORPAY_KEY_SECRET,
    `/orders/${orderId}`,
    "GET",
  );

  if (!orderRes.ok) {
    return { status: 502, body: { error: "Failed to fetch Razorpay order" } };
  }

  const order = (await orderRes.json()) as RazorpayOrder;
  const workspaceId = order.notes?.workspaceId;
  const planId = order.notes?.planId as PlanId | undefined;

  if (!workspaceId || !planId || !PLANS[planId]) {
    return { status: 200, body: { received: true } };
  }

  await applyPlanUpgrade(workspaceId, planId);

  await publishBillingEvent(config, {
    workspaceId,
    plan: planId,
    eventType: "billing.plan_upgraded",
  });

  return { status: 200, body: { received: true, plan: planId } };
}
