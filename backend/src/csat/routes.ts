import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { createAuthHook } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { sendOutboundEmail } from "../email/routes.js";

export async function createCsatSurvey(ticketId: string, config: AppConfig): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { inbox: true, csatSurvey: true },
  });
  if (!ticket || ticket.csatSurvey) return;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.csatSurvey.create({ data: { ticketId } }),
    prisma.portalToken.create({
      data: { ticketId, token, expiresAt },
    }),
  ]);

  const surveyUrl = `${config.FRONTEND_URL}/portal/csat/${token}`;
  const from = ticket.inbox?.email ?? "support@streammeo.com";

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

    const surveys = await prisma.csatSurvey.findMany({
      where: {
        ticket: { workspaceId: authPayload.workspaceId },
        rating: { not: null },
      },
      select: { rating: true },
    });

    const total = surveys.length;
    const avgScore =
      total > 0
        ? Math.round((surveys.reduce((s, x) => s + (x.rating ?? 0), 0) / total) * 10) / 10
        : null;

    return { totalResponses: total, avgScore };
  });

  app.get("/api/v1/portal/csat/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const portalToken = await prisma.portalToken.findUnique({
      where: { token },
      include: {
        ticket: {
          select: {
            number: true,
            subject: true,
            status: true,
            csatSurvey: true,
          },
        },
      },
    });

    if (!portalToken || portalToken.expiresAt < new Date()) {
      return reply.code(404).send({ error: "Survey link expired or invalid" });
    }

    return {
      ticketNumber: portalToken.ticket.number,
      subject: portalToken.ticket.subject,
      alreadyResponded: !!portalToken.ticket.csatSurvey?.respondedAt,
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

    const portalToken = await prisma.portalToken.findUnique({
      where: { token },
      include: { ticket: { include: { csatSurvey: true } } },
    });

    if (!portalToken || portalToken.expiresAt < new Date()) {
      return reply.code(404).send({ error: "Survey link expired or invalid" });
    }

    if (portalToken.ticket.csatSurvey?.respondedAt) {
      return reply.code(409).send({ error: "Survey already submitted" });
    }

    await prisma.csatSurvey.update({
      where: { ticketId: portalToken.ticketId },
      data: {
        rating: body.data.rating,
        comment: body.data.comment,
        respondedAt: new Date(),
      },
    });

    return { ok: true };
  });
}
