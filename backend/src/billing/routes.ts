import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { createAuthHook, requireRole } from "../auth/middleware.js";
import { PLANS, type PlanId } from "@streammeo/shared";
import { prisma } from "../db.js";
import {
  applyPlanUpgrade,
  razorpayFetch,
  verifyPaymentSignature,
  type RazorpayOrder,
} from "./service.js";
import { handleBillingWebhook } from "../webhooks/billing.js";
import { publishBillingEvent } from "../realtime/appsync.js";

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function registerBillingRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);
  const adminOnly = [auth, requireRole("admin")];

  app.get("/api/v1/billing/plans", async () => {
    return {
      plans: Object.entries(PLANS).map(([id, plan]) => ({
        id,
        ...plan,
        priceDisplay: `₹${(plan.priceMonthly / 100).toLocaleString("en-IN")}/mo`,
        currency: "INR",
      })),
      razorpayKeyId: config.RAZORPAY_KEY_ID ?? null,
    };
  });

  app.get("/api/v1/billing/usage", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const workspace = await prisma.workspace.findUnique({
      where: { id: authPayload.workspaceId },
    });
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const plan = PLANS[workspace.plan as PlanId] ?? PLANS.starter;

    return {
      plan: workspace.plan,
      planName: plan.name,
      ticketsUsed: workspace.ticketsUsed,
      ticketsLimit: workspace.ticketsLimit,
      agentsLimit: plan.agentsLimit,
      inboxesLimit: plan.inboxesLimit,
      aiRepliesUsed: workspace.aiRepliesUsed,
      aiRepliesLimit: plan.aiRepliesLimit,
    };
  });

  app.post("/api/v1/billing/checkout", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = request.body as { planId?: PlanId };
    const planId = body.planId ?? "growth";
    const plan = PLANS[planId];
    if (!plan) return reply.code(400).send({ error: "Invalid plan" });

    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
      return reply.code(503).send({
        error: "Billing not configured",
        message: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable checkout",
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: authPayload.workspaceId },
      include: { members: { where: { userId: authPayload.userId }, include: { user: true } } },
    });
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const receipt = `ws_${workspace.id.slice(0, 8)}_${planId}_${Date.now()}`;
    const orderRes = await razorpayFetch(
      config.RAZORPAY_KEY_ID,
      config.RAZORPAY_KEY_SECRET,
      "/orders",
      "POST",
      {
        amount: plan.priceMonthly,
        currency: "INR",
        receipt,
        notes: {
          workspaceId: workspace.id,
          planId,
        },
      },
    );

    if (!orderRes.ok) {
      const err = await orderRes.text();
      app.log.error({ err }, "Razorpay order creation failed");
      return reply.code(502).send({ error: "Failed to create payment order" });
    }

    const order = (await orderRes.json()) as RazorpayOrder;
    const user = workspace.members[0]?.user;

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.RAZORPAY_KEY_ID,
      planId,
      planName: plan.name,
      prefill: {
        email: user?.email ?? authPayload.email,
        name: user?.name ?? undefined,
      },
    };
  });

  app.post("/api/v1/billing/verify", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    if (!config.RAZORPAY_KEY_SECRET) {
      return reply.code(503).send({ error: "Billing not configured" });
    }

    const body = verifySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const valid = verifyPaymentSignature(
      body.data.razorpay_order_id,
      body.data.razorpay_payment_id,
      body.data.razorpay_signature,
      config.RAZORPAY_KEY_SECRET,
    );
    if (!valid) return reply.code(400).send({ error: "Invalid payment signature" });

    if (!config.RAZORPAY_KEY_ID) {
      return reply.code(503).send({ error: "Billing not configured" });
    }

    const orderRes = await razorpayFetch(
      config.RAZORPAY_KEY_ID,
      config.RAZORPAY_KEY_SECRET,
      `/orders/${body.data.razorpay_order_id}`,
      "GET",
    );
    if (!orderRes.ok) {
      return reply.code(502).send({ error: "Failed to fetch order" });
    }

    const order = (await orderRes.json()) as RazorpayOrder;
    const workspaceId = order.notes?.workspaceId;
    const planId = order.notes?.planId as PlanId | undefined;

    if (!workspaceId || workspaceId !== authPayload.workspaceId) {
      return reply.code(403).send({ error: "Order does not belong to this workspace" });
    }
    if (!planId || !PLANS[planId]) {
      return reply.code(400).send({ error: "Invalid plan on order" });
    }

    await applyPlanUpgrade(workspaceId, planId);
    await publishBillingEvent(config, {
      workspaceId,
      plan: planId,
      eventType: "billing.plan_upgraded",
    });

    return { ok: true, plan: planId };
  });

  app.post("/api/v1/billing/webhook", async (request, reply) => {
    const signature = request.headers["x-razorpay-signature"] as string | undefined;
    const rawBody = JSON.stringify(request.body);
    const result = await handleBillingWebhook(config, rawBody, request.body, signature);
    return reply.code(result.status).send(result.body);
  });
}
