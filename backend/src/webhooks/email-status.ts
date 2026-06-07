import { z } from "zod";
import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { publishEmailStatusEvent } from "../realtime/appsync.js";

const emailStatusSchema = z.object({
  messageId: z.string().optional(),
  to: z.string().email().optional(),
  status: z.string().min(1),
  ticketId: z.string().optional(),
  workspaceId: z.string().optional(),
});

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handleEmailStatusWebhook(
  config: AppConfig,
  body: unknown,
): Promise<WebhookResult> {
  const parsed = emailStatusSchema.safeParse(body);
  const payload = parsed.success ? parsed.data : (body as Record<string, unknown>);

  let workspaceId = parsed.success ? parsed.data.workspaceId : undefined;
  let ticketId = parsed.success ? parsed.data.ticketId : undefined;

  if (!workspaceId && ticketId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { workspaceId: true },
    });
    workspaceId = ticket?.workspaceId;
  }

  if (workspaceId) {
    await publishEmailStatusEvent(config, {
      workspaceId,
      ticketId,
      status: parsed.success ? parsed.data.status : String(payload.status ?? "unknown"),
      payload: typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {},
    });
  }

  return { status: 200, body: { ok: true } };
}
