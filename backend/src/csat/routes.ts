import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createCsatSurvey,
  createPortalToken,
  getCsatSurvey,
  getInboxById,
  getTicketByIdOnly,
  listCsatRatingsForWorkspace,
  resolvePortalTicket,
  updateCsatSurvey,
} from "@streammeo/db";
import type { AppConfig } from "../config.js";
import { createAuthHook } from "../auth/middleware.js";
import { sendOutboundEmail } from "../email/routes.js";

export async function createCsatSurveyForTicket(ticketId: string, config: AppConfig): Promise<void> {
  const ticket = await getTicketByIdOnly(ticketId);
  if (!ticket) return;

  const existing = await getCsatSurvey(ticketId);
  if (existing) return;

  const token = await createPortalToken(
    ticketId,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  await createCsatSurvey(ticketId);

  const surveyUrl = `${config.FRONTEND_URL}/portal/csat/${token}`;
  const inbox = ticket.inboxId ? await getInboxById(ticket.workspaceId, ticket.inboxId) : null;
  const from = inbox?.email ?? "support@streammeo.com";

  await sendOutboundEmail(config, {
    to: ticket.requesterEmail,
    from,
    subject: `How did we do? Ticket #${ticket.number}`,
    body: `Hi ${ticket.requesterName ?? "there"},\n\nYour support ticket #${ticket.number} has been resolved. We'd love your feedback:\n\n${surveyUrl}\n\nThank you!`,
  }).catch(() => undefined);
}

export async function registerCsatRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);

  app.get("/api/v1/csat/summary", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const ratings = await listCsatRatingsForWorkspace(authPayload.workspaceId);
    const total = ratings.length;
    const avgScore =
      total > 0
        ? Math.round((ratings.reduce((s, x) => s + x, 0) / total) * 10) / 10
        : null;

    return { totalResponses: total, avgScore };
  });

  app.get("/api/v1/portal/csat/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const resolved = await resolvePortalTicket(token);
    if (!resolved) return reply.code(404).send({ error: "Survey link expired or invalid" });

    const survey = await getCsatSurvey(resolved.ticket.id);

    return {
      ticketNumber: resolved.ticket.number,
      subject: resolved.ticket.subject,
      alreadyResponded: !!survey?.respondedAt,
    };
  });

  app.post("/api/v1/portal/csat/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const body = z
      .object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
      })
      .safeParse(request.body);

    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const resolved = await resolvePortalTicket(token);
    if (!resolved) return reply.code(404).send({ error: "Survey link expired or invalid" });

    const survey = await getCsatSurvey(resolved.ticket.id);
    if (survey?.respondedAt) {
      return reply.code(409).send({ error: "Survey already submitted" });
    }

    await updateCsatSurvey(resolved.ticket.id, {
      rating: body.data.rating,
      comment: body.data.comment,
      respondedAt: new Date().toISOString(),
    });

    return { ok: true };
  });
}
