import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { createAuthHook } from "../auth/middleware.js";
import { getWorkspaceById, incrementWorkspaceCounter } from "@streammeo/db";
import { getTicketById } from "../tickets/service.js";
import { PLANS, type PlanId } from "@streammeo/shared";

const suggestSchema = z.object({
  ticketId: z.string(),
});

export async function suggestReply(
  config: AppConfig,
  ticketContext: {
    subject: string;
    requesterName: string | null;
    comments: Array<{ role: string; body: string }>;
  },
): Promise<string> {
  const thread = ticketContext.comments
    .map((c) => `${c.role}: ${c.body}`)
    .join("\n\n");

  if (config.ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system:
          "You are a helpful customer support agent. Draft a concise, professional reply. Do not include placeholders unless necessary. Sign off warmly.",
        messages: [
          {
            role: "user",
            content: `Ticket subject: ${ticketContext.subject}\nCustomer: ${ticketContext.requesterName ?? "Customer"}\n\nConversation:\n${thread}\n\nDraft a reply the agent can send:`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = data.content.find((b) => b.type === "text")?.text;
    if (text) return text.trim();
  }

  const customer = ticketContext.requesterName ?? "there";
  return `Hi ${customer},\n\nThank you for reaching out about "${ticketContext.subject}". I've reviewed your message and I'm looking into this for you now. I'll follow up shortly with an update.\n\nBest regards,\nSupport Team`;
}

export async function registerAiRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);

  app.post("/api/v1/ai/suggest-reply", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = suggestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const workspace = await getWorkspaceById(authPayload.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const plan = PLANS[workspace.plan as PlanId] ?? PLANS.starter;
    if (plan.aiRepliesLimit === 0) {
      return reply.code(403).send({ error: "AI replies require Growth plan or higher" });
    }
    if (workspace.aiRepliesUsed >= plan.aiRepliesLimit) {
      return reply.code(429).send({ error: "Monthly AI reply limit reached" });
    }

    const ticket = await getTicketById(authPayload.workspaceId, body.data.ticketId);
    if (!ticket) return reply.code(404).send({ error: "Ticket not found" });

    const comments = ticket.comments.map((c) => ({
      role: c.visibility === "internal" ? "agent (internal)" : c.author ? "agent" : "customer",
      body: c.body,
    }));

    const suggestion = await suggestReply(config, {
      subject: ticket.subject,
      requesterName: ticket.requesterName,
      comments,
    });

    await incrementWorkspaceCounter(workspace.id, "aiRepliesUsed");

    return { suggestion, aiRepliesUsed: workspace.aiRepliesUsed + 1 };
  });
}
