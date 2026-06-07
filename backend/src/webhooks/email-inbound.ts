import { z } from "zod";
import type { AppConfig } from "../config.js";
import { prisma } from "../db.js";
import { publishTicketEvent } from "../realtime/appsync.js";
import { createTicket } from "../tickets/service.js";

const inboundEmailSchema = z.object({
  from: z.string().email(),
  fromName: z.string().optional(),
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
  messageId: z.string().optional(),
});

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handleInboundEmailWebhook(
  config: AppConfig,
  body: unknown,
  headers: Record<string, string | undefined>,
): Promise<WebhookResult> {
  if (config.BREVO_WEBHOOK_SECRET) {
    const secret = headers["x-streammeo-webhook-secret"];
    if (secret !== config.BREVO_WEBHOOK_SECRET) {
      return { status: 401, body: { error: "Invalid webhook secret" } };
    }
  }

  const parsed = inboundEmailSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: "Invalid payload" } };
  }

  const inbox = await prisma.inbox.findFirst({
    where: { email: parsed.data.to },
    include: { workspace: true },
  });

  if (!inbox) {
    return { status: 404, body: { error: "Inbox not found" } };
  }

  const ticket = await createTicket({
    workspaceId: inbox.workspaceId,
    inboxId: inbox.id,
    subject: parsed.data.subject,
    body: parsed.data.text,
    requesterEmail: parsed.data.from,
    requesterName: parsed.data.fromName,
  });

  if (inbox.autoResponderEnabled && inbox.autoResponderMessage) {
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        body: inbox.autoResponderMessage,
        visibility: "public",
        isEmail: true,
      },
    });
  }

  await publishTicketEvent(config, {
    workspaceId: inbox.workspaceId,
    ticketId: ticket.id,
    eventType: "ticket.created",
    payload: {
      source: "email",
      number: ticket.number,
      subject: ticket.subject,
      inboxId: inbox.id,
    },
  });

  return {
    status: 201,
    body: { ticketId: ticket.id, number: ticket.number },
  };
}
