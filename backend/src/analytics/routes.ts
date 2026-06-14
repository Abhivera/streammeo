import type { FastifyInstance } from "fastify";
import { listAllTickets } from "@streammeo/db";
import { listCsatRatingsForWorkspace, listChatCsatRatingsForWorkspace } from "@streammeo/db";
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

    const allTickets = await listAllTickets(workspaceId);
    const openStatuses = new Set(["new", "open", "pending"]);
    const resolvedStatuses = new Set(["resolved", "closed"]);

    const openTickets = allTickets.filter((t) => openStatuses.has(t.status)).length;
    const ticketsToday = allTickets.filter((t) => new Date(t.createdAt) >= startOfDay).length;
    const ticketsThisWeek = allTickets.filter((t) => new Date(t.createdAt) >= startOfWeek).length;
    const resolvedTickets = allTickets.filter((t) => resolvedStatuses.has(t.status)).length;
    const breachedTickets = allTickets.filter(
      (t) => t.slaBreached && openStatuses.has(t.status),
    ).length;

    const ticketCsat = await listCsatRatingsForWorkspace(workspaceId);
    const chatCsat = await listChatCsatRatingsForWorkspace(workspaceId);
    const csatRatings = [...ticketCsat, ...chatCsat];
    const csatAvgScore =
      csatRatings.length > 0
        ? Math.round((csatRatings.reduce((s, r) => s + r, 0) / csatRatings.length) * 10) / 10
        : null;

    const totalTickets = allTickets.length;
    const resolutionRate =
      totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

    const resolvedWithTimes = allTickets
      .filter((t) => t.resolvedAt)
      .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))
      .slice(0, 500);

    const avgResolutionHours =
      resolvedWithTimes.length > 0
        ? resolvedWithTimes.reduce((sum, t) => {
            const hours =
              (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000;
            return sum + hours;
          }, 0) / resolvedWithTimes.length
        : 0;

    const statusCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();
    for (const t of allTickets) {
      statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
      if (openStatuses.has(t.status)) {
        priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
      }
    }

    const recentTickets = [...allTickets]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);

    return {
      openTickets,
      ticketsToday,
      ticketsThisWeek,
      totalTickets,
      resolutionRate,
      slaBreaches: breachedTickets,
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      csatAvgScore,
      csatResponses: csatRatings.length,
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
      byPriority: [...priorityCounts.entries()].map(([priority, count]) => ({ priority, count })),
      recentTickets: recentTickets.map((t) => ({
        id: t.id,
        number: t.number,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt,
        slaBreached: t.slaBreached,
      })),
    };
  });
}
