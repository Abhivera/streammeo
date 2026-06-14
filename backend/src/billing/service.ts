import crypto from "node:crypto";
import { PLANS, type PlanId } from "@streammeo/shared";
import { getWorkspaceById, updateWorkspace } from "@streammeo/db";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
};

export async function razorpayFetch(
  keyId: string,
  keySecret: string,
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<Response> {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export async function applyPlanUpgrade(workspaceId: string, planId: PlanId): Promise<void> {
  const plan = PLANS[planId];
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) return;
  await updateWorkspace(workspaceId, {
    plan: planId,
    ticketsLimit: plan.ticketsLimit,
    aiRepliesLimit: plan.aiRepliesLimit,
  });
}
