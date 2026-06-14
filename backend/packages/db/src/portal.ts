import type { CsatSurvey, PortalToken } from "./types.js";
import { getItem, newId, nowIso, putItem, queryGsi1, type DbItem } from "./store.js";
import { getTicket, getTicketByIdOnly } from "./tickets.js";

type PortalItem = DbItem & PortalToken & { entityType: "portal_token" };
type CsatItem = DbItem & CsatSurvey & { entityType: "csat_survey" };

export async function createPortalToken(ticketId: string, expiresAt?: string): Promise<string> {
  const existing = await findValidPortalTokenForTicket(ticketId);
  if (existing) return existing.token;

  const token = crypto.randomUUID();
  const id = newId();
  const portal: PortalToken = {
    id,
    ticketId,
    token,
    expiresAt: expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso(),
  };
  await putItem({
    pk: `PORTAL#${token}`,
    sk: "TOKEN",
    entityType: "portal_token",
    gsi1pk: `TICKET_PORTAL#${ticketId}`,
    gsi1sk: portal.createdAt,
    ...portal,
  });
  return token;
}

export async function findValidPortalTokenForTicket(ticketId: string): Promise<PortalToken | null> {
  const { items } = await queryGsi1<PortalItem>(`TICKET_PORTAL#${ticketId}`, { scanForward: false });
  const now = nowIso();
  return items.find((t) => t.expiresAt > now) ?? null;
}

export async function getPortalToken(token: string): Promise<PortalToken | null> {
  const item = await getItem<PortalItem>(`PORTAL#${token}`, "TOKEN");
  if (!item) return null;
  return {
    id: item.id,
    ticketId: item.ticketId,
    token: item.token,
    expiresAt: item.expiresAt,
    createdAt: item.createdAt,
  };
}

export async function createCsatSurvey(ticketId: string): Promise<CsatSurvey> {
  const existing = await getCsatSurvey(ticketId);
  if (existing) return existing;

  const id = newId();
  const survey: CsatSurvey = {
    id,
    ticketId,
    rating: null,
    comment: null,
    sentAt: nowIso(),
    respondedAt: null,
  };
  await putItem({
    pk: `TICKET#${ticketId}`,
    sk: "CSAT",
    entityType: "csat_survey",
    ...survey,
  });
  return survey;
}

export async function getCsatSurvey(ticketId: string): Promise<CsatSurvey | null> {
  const item = await getItem<CsatItem>(`TICKET#${ticketId}`, "CSAT");
  if (!item) return null;
  return {
    id: item.id,
    ticketId: item.ticketId,
    rating: item.rating,
    comment: item.comment,
    sentAt: item.sentAt,
    respondedAt: item.respondedAt,
  };
}

export async function updateCsatSurvey(
  ticketId: string,
  patch: Partial<Pick<CsatSurvey, "rating" | "comment" | "respondedAt">>,
): Promise<CsatSurvey | null> {
  const existing = await getCsatSurvey(ticketId);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await putItem({
    pk: `TICKET#${ticketId}`,
    sk: "CSAT",
    entityType: "csat_survey",
    ...updated,
  });
  return updated;
}

export async function listCsatRatingsForWorkspace(workspaceId: string): Promise<number[]> {
  const { listAllTickets } = await import("./tickets.js");
  const tickets = await listAllTickets(workspaceId);
  const ratings: number[] = [];
  for (const ticket of tickets) {
    const survey = await getCsatSurvey(ticket.id);
    if (survey?.rating != null) ratings.push(survey.rating);
  }
  return ratings;
}

export async function resolvePortalTicket(token: string) {
  const portal = await getPortalToken(token);
  if (!portal || portal.expiresAt < nowIso()) return null;

  const ticket =
    (await getTicketByIdOnly(portal.ticketId)) ??
    (await (async () => {
      const lookup = await getItem<DbItem & { workspaceId: string }>(`TICKET_ID#${portal.ticketId}`, "LOOKUP");
      if (!lookup) return null;
      return getTicket(lookup.workspaceId, portal.ticketId);
    })());

  if (!ticket) return null;
  return { portal, ticket };
}
