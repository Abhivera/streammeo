import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import type { AppConfig } from "../config.js";
import { createAuthHook } from "../auth/middleware.js";

export async function registerAnalyticsRoutes(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  const auth = createAuthHook(config);

  app.get("/api/v1/analytics/overview", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const workspaceId = authPayload.workspaceId;
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [openTickets, ticketsToday, ticketsThisWeek, resolvedTickets, breachedTickets, csatAgg] =
      await Promise.all([
        prisma.ticket.count({
          where: { workspaceId, status: { in: ["new", "open", "pending"] } },
        }),
        prisma.ticket.count({
          where: { workspaceId, createdAt: { gte: startOfDay } },
        }),
        prisma.ticket.count({
          where: { workspaceId, createdAt: { gte: startOfWeek } },
        }),
        prisma.ticket.count({
          where: { workspaceId, status: { in: ["resolved", "closed"] } },
        }),
        prisma.ticket.count({
          where: { workspaceId, slaBreached: true, status: { in: ["new", "open", "pending"] } },
        }),
        prisma.csatSurvey.aggregate({
          where: { ticket: { workspaceId }, rating: { not: null } },
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ]);

    const totalTickets = await prisma.ticket.count({ where: { workspaceId } });
    const resolutionRate =
      totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

    const resolvedWithTimes = await prisma.ticket.findMany({
      where: { workspaceId, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 500,
      orderBy: { resolvedAt: "desc" },
    });

    const avgResolutionHours =
      resolvedWithTimes.length > 0
        ? resolvedWithTimes.reduce((sum, t) => {
            const hours =
              ((t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000);
            return sum + hours;
          }, 0) / resolvedWithTimes.length
        : 0;

    const byStatus = await prisma.ticket.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    });

    const byPriority = await prisma.ticket.groupBy({
      by: ["priority"],
      where: { workspaceId, status: { in: ["new", "open", "pending"] } },
      _count: { _all: true },
    });

    const recentTickets = await prisma.ticket.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        subject: true,
        status: true,
        priority: true,
        updatedAt: true,
        slaBreached: true,
      },
    });

    return {
      openTickets,
      ticketsToday,
      ticketsThisWeek,
      totalTickets,
      resolutionRate,
      slaBreaches: breachedTickets,
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      csatAvgScore: csatAgg._avg.rating
        ? Math.round(csatAgg._avg.rating * 10) / 10
        : null,
      csatResponses: csatAgg._count._all,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
      recentTickets: recentTickets.map((t) => ({
        ...t,
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  });
}
