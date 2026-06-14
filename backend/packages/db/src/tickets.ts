import type {
  CommentVisibility,
  Inbox,
  RoutingRule,
  SlaPolicy,
  Tag,
  Ticket,
  TicketComment,
  TicketEvent,
  TicketPriority,
  TicketStatus,
} from "./types.js";
import { getUserById, toUserPublic } from "./users.js";
import {
  allocateTicketNumber,
  getWorkspaceById,
  incrementWorkspaceCounter,
} from "./workspaces.js";
import {
  batchDelete,
  deleteItem,
  getItem,
  newId,
  nowIso,
  putItem,
  queryGsi1,
  queryGsi2,
  queryPk,
  transactWrite,
  type DbItem,
} from "./store.js";

type TicketItem = DbItem & Ticket & { entityType: "ticket" };
type CommentItem = DbItem & TicketComment & { entityType: "ticket_comment" };
type EventItem = DbItem & TicketEvent & { entityType: "ticket_event" };
type TagLinkItem = DbItem & { entityType: "ticket_tag"; ticketId: string; tagId: string };
type TagItem = DbItem & Tag & { entityType: "tag" };
type InboxItem = DbItem & Inbox & { entityType: "inbox" };
type SlaItem = DbItem & SlaPolicy & { entityType: "sla_policy" };

function workspacePk(wsId: string) {
  return `WORKSPACE#${wsId}`;
}

function ticketPk(ticketId: string) {
  return `TICKET#${ticketId}`;
}

function ticketGsi1pk(workspaceId: string) {
  return `WS#${workspaceId}#TICKETS`;
}

function ticketGsi1sk(updatedAt: string, ticketId: string) {
  return `${updatedAt}#${ticketId}`;
}

function openSlaGsi(ticket: Ticket): { gsi2pk?: string; gsi2sk?: string } {
  const open = ["new", "open", "pending"].includes(ticket.status);
  if (open && ticket.slaPolicyId && !ticket.slaBreached) {
    return { gsi2pk: "OPEN_SLA", gsi2sk: `${ticket.createdAt}#${ticket.id}` };
  }
  return {};
}

export async function getInboxById(workspaceId: string, inboxId: string): Promise<Inbox | null> {
  const item = await getItem<InboxItem>(workspacePk(workspaceId), `INBOX#${inboxId}`);
  return item ? stripInbox(item) : null;
}

export async function getDefaultInbox(workspaceId: string): Promise<Inbox | null> {
  const items = await queryPk<InboxItem>(workspacePk(workspaceId), "INBOX#");
  const found = items.find((i) => i.isDefault) ?? items[0];
  return found ? stripInbox(found) : null;
}

export async function findInboxByEmail(email: string): Promise<(Inbox & { workspaceId: string }) | null> {
  const { items } = await queryGsi1<InboxItem>(`INBOX_EMAIL#${email.toLowerCase()}`);
  const item = items[0];
  if (!item) return null;
  return stripInbox(item);
}

export async function listInboxes(workspaceId: string): Promise<Inbox[]> {
  const items = await queryPk<InboxItem>(workspacePk(workspaceId), "INBOX#");
  return items.map(stripInbox).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createInbox(
  workspaceId: string,
  data: Omit<Inbox, "id" | "workspaceId" | "createdAt" | "channel"> & { channel?: Inbox["channel"] },
): Promise<Inbox> {
  const id = newId();
  const inbox: Inbox = {
    id,
    workspaceId,
    channel: data.channel ?? "email",
    createdAt: nowIso(),
    ...data,
  };
  await putItem({
    pk: workspacePk(workspaceId),
    sk: `INBOX#${id}`,
    entityType: "inbox",
    gsi1pk: `INBOX_EMAIL#${inbox.email.toLowerCase()}`,
    gsi1sk: `WORKSPACE#${workspaceId}#${id}`,
    ...inbox,
  });
  return inbox;
}

export async function updateInbox(
  workspaceId: string,
  inboxId: string,
  patch: Partial<Omit<Inbox, "id" | "workspaceId" | "createdAt">>,
): Promise<Inbox | null> {
  const existing = await getInboxById(workspaceId, inboxId);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  const item = await getItem<InboxItem>(workspacePk(workspaceId), `INBOX#${inboxId}`);
  if (!item) return null;
  await putItem({
    ...item,
    ...updated,
    ...(patch.email
      ? {
          gsi1pk: `INBOX_EMAIL#${updated.email.toLowerCase()}`,
          gsi1sk: `WORKSPACE#${workspaceId}#${inboxId}`,
        }
      : {}),
  });
  return updated;
}

export async function getSlaPolicy(workspaceId: string, id: string): Promise<SlaPolicy | null> {
  const item = await getItem<SlaItem>(workspacePk(workspaceId), `SLA#${id}`);
  return item ? stripSla(item) : null;
}

export async function getDefaultSlaPolicy(workspaceId: string): Promise<SlaPolicy | null> {
  const items = await queryPk<SlaItem>(workspacePk(workspaceId), "SLA#");
  const found = items.find((i) => i.isDefault) ?? items[0];
  return found ? stripSla(found) : null;
}

export async function listSlaPolicies(workspaceId: string): Promise<SlaPolicy[]> {
  const items = await queryPk<SlaItem>(workspacePk(workspaceId), "SLA#");
  return items.map(stripSla).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createSlaPolicy(
  workspaceId: string,
  data: Omit<SlaPolicy, "id" | "workspaceId">,
): Promise<SlaPolicy> {
  const id = newId();
  const policy: SlaPolicy = { id, workspaceId, ...data };
  await putItem({
    pk: workspacePk(workspaceId),
    sk: `SLA#${id}`,
    entityType: "sla_policy",
    ...policy,
  });
  return policy;
}

export async function updateSlaPolicy(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<SlaPolicy, "id" | "workspaceId">>,
): Promise<SlaPolicy | null> {
  const existing = await getSlaPolicy(workspaceId, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  const item = await getItem<SlaItem>(workspacePk(workspaceId), `SLA#${id}`);
  if (!item) return null;
  await putItem({ ...item, ...updated });
  return updated;
}

export async function clearDefaultSlaPolicies(workspaceId: string, exceptId?: string): Promise<void> {
  const items = await queryPk<SlaItem>(workspacePk(workspaceId), "SLA#");
  for (const item of items) {
    if (item.isDefault && item.id !== exceptId) {
      await putItem({ ...item, isDefault: false });
    }
  }
}

export async function listTags(workspaceId: string): Promise<Tag[]> {
  const items = await queryPk<TagItem>(workspacePk(workspaceId), "TAG#");
  return items.map(stripTag).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTicketTags(ticketId: string): Promise<Tag[]> {
  const links = await queryPk<TagLinkItem>(ticketPk(ticketId), "TAG#");
  const tags: Tag[] = [];
  for (const link of links) {
    const wsId = link.workspaceId as string;
    const tag = await getItem<TagItem>(workspacePk(wsId), `TAG#${link.tagId}`);
    if (tag) tags.push(stripTag(tag));
  }
  return tags;
}

export async function addTicketTags(ticketId: string, workspaceId: string, tagIds: string[]): Promise<void> {
  for (const tagId of tagIds) {
    await putItem({
      pk: ticketPk(ticketId),
      sk: `TAG#${tagId}`,
      entityType: "ticket_tag",
      ticketId,
      tagId,
      workspaceId,
    });
  }
}

export async function getTicketComments(ticketId: string): Promise<TicketComment[]> {
  const items = await queryPk<CommentItem>(ticketPk(ticketId), "COMMENT#");
  return items.map(stripComment).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getTicketEvents(ticketId: string): Promise<TicketEvent[]> {
  const items = await queryPk<EventItem>(ticketPk(ticketId), "EVENT#");
  return items.map(stripEvent).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createTicketComment(input: {
  ticketId: string;
  authorId?: string | null;
  body: string;
  visibility: CommentVisibility;
  isEmail?: boolean;
}): Promise<TicketComment> {
  const id = newId();
  const createdAt = nowIso();
  const comment: TicketComment = {
    id,
    ticketId: input.ticketId,
    authorId: input.authorId ?? null,
    body: input.body,
    visibility: input.visibility,
    isEmail: input.isEmail ?? input.visibility === "public",
    createdAt,
  };
  await putItem({
    pk: ticketPk(input.ticketId),
    sk: `COMMENT#${createdAt}#${id}`,
    entityType: "ticket_comment",
    ...comment,
  });
  return comment;
}

export async function createTicketEvent(input: {
  ticketId: string;
  actorId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<TicketEvent> {
  const id = newId();
  const createdAt = nowIso();
  const event: TicketEvent = {
    id,
    ticketId: input.ticketId,
    actorId: input.actorId ?? null,
    eventType: input.eventType,
    payload: input.payload ?? {},
    createdAt,
  };
  await putItem({
    pk: ticketPk(input.ticketId),
    sk: `EVENT#${createdAt}#${id}`,
    entityType: "ticket_event",
    ...event,
  });
  return event;
}

async function saveTicket(ticket: Ticket): Promise<void> {
  const slaGsi = openSlaGsi(ticket);
  await putItem({
    pk: workspacePk(ticket.workspaceId),
    sk: `TICKET#${ticket.id}`,
    entityType: "ticket",
    gsi1pk: ticketGsi1pk(ticket.workspaceId),
    gsi1sk: ticketGsi1sk(ticket.updatedAt, ticket.id),
    ...slaGsi,
    ...ticket,
  });
}

export async function getTicket(workspaceId: string, ticketId: string): Promise<Ticket | null> {
  const item = await getItem<TicketItem>(workspacePk(workspaceId), `TICKET#${ticketId}`);
  return item ? stripTicket(item) : null;
}

export async function getTicketByIdOnly(ticketId: string): Promise<Ticket | null> {
  const lookup = await getItem<DbItem & { workspaceId: string }>(`TICKET_ID#${ticketId}`, "LOOKUP");
  if (!lookup) return null;
  return getTicket(lookup.workspaceId, ticketId);
}

export type TicketListFilters = {
  workspaceId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
  search?: string;
  tag?: string;
  cursor?: string;
  limit?: number;
};

export async function listTickets(filters: TicketListFilters): Promise<{
  items: Ticket[];
  nextCursor: string | null;
}> {
  const limit = Math.min(filters.limit ?? 50, 100);
  let exclusiveStartKey: Record<string, unknown> | undefined;

  if (filters.cursor) {
    const ticket = await getTicket(filters.workspaceId, filters.cursor);
    if (ticket) {
      exclusiveStartKey = {
        pk: workspacePk(filters.workspaceId),
        sk: `TICKET#${ticket.id}`,
        gsi1pk: ticketGsi1pk(filters.workspaceId),
        gsi1sk: ticketGsi1sk(ticket.updatedAt, ticket.id),
      };
    }
  }

  const { items, lastKey } = await queryGsi1<TicketItem>(ticketGsi1pk(filters.workspaceId), {
    scanForward: false,
    limit: limit + 20,
    exclusiveStartKey,
  });

  let tickets = items.map(stripTicket);

  if (filters.status) tickets = tickets.filter((t) => t.status === filters.status);
  if (filters.priority) tickets = tickets.filter((t) => t.priority === filters.priority);
  if (filters.assigneeId) tickets = tickets.filter((t) => t.assigneeId === filters.assigneeId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.requesterEmail.toLowerCase().includes(q) ||
        (t.requesterName?.toLowerCase().includes(q) ?? false),
    );
  }
  if (filters.tag) {
    const tagged: Ticket[] = [];
    for (const t of tickets) {
      const tags = await getTicketTags(t.id);
      if (tags.some((tag) => tag.name === filters.tag)) tagged.push(t);
    }
    tickets = tagged;
  }

  const hasMore = tickets.length > limit;
  const page = hasMore ? tickets.slice(0, limit) : tickets;

  return {
    items: page,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : lastKey ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function listAllTickets(workspaceId: string): Promise<Ticket[]> {
  const { items } = await queryGsi1<TicketItem>(ticketGsi1pk(workspaceId));
  return items.map(stripTicket);
}

export async function createTicketRecord(input: {
  workspaceId: string;
  inboxId?: string | null;
  slaPolicyId?: string | null;
  subject: string;
  requesterEmail: string;
  requesterName?: string | null;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigneeId?: string | null;
}): Promise<Ticket> {
  const number = await allocateTicketNumber(input.workspaceId);
  const createdAt = nowIso();
  const ticket: Ticket = {
    id: newId(),
    workspaceId: input.workspaceId,
    inboxId: input.inboxId ?? null,
    number,
    subject: input.subject,
    status: input.status ?? "new",
    priority: input.priority ?? "normal",
    requesterEmail: input.requesterEmail,
    requesterName: input.requesterName ?? null,
    assigneeId: input.assigneeId ?? null,
    slaPolicyId: input.slaPolicyId ?? null,
    slaBreached: false,
    firstResponseAt: null,
    resolvedAt: null,
    closedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
  await saveTicket(ticket);
  await putItem({
    pk: `TICKET_ID#${ticket.id}`,
    sk: "LOOKUP",
    entityType: "ticket_lookup",
    gsi1pk: `TICKET_ID#${ticket.id}`,
    gsi1sk: `WORKSPACE#${input.workspaceId}`,
    ticketId: ticket.id,
    workspaceId: input.workspaceId,
  });
  await incrementWorkspaceCounter(input.workspaceId, "ticketsUsed");
  return ticket;
}

export async function updateTicketRecord(
  workspaceId: string,
  ticketId: string,
  patch: Partial<Ticket>,
): Promise<Ticket | null> {
  const existing = await getTicket(workspaceId, ticketId);
  if (!existing) return null;
  const updated: Ticket = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? nowIso(),
  };
  await saveTicket(updated);
  return updated;
}

export async function deleteTickets(workspaceId: string, ticketIds: string[]): Promise<number> {
  let deleted = 0;
  for (const ticketId of ticketIds) {
    const ticket = await getTicket(workspaceId, ticketId);
    if (!ticket) continue;
    const children = await queryPk<DbItem>(ticketPk(ticketId));
    await batchDelete([
      { pk: workspacePk(workspaceId), sk: `TICKET#${ticketId}` },
      { pk: `TICKET_ID#${ticketId}`, sk: "LOOKUP" },
      ...children.map((c) => ({ pk: c.pk, sk: c.sk })),
    ]);
    deleted++;
  }
  return deleted;
}

export async function listOpenSlaTickets(): Promise<Array<Ticket & { slaPolicy?: SlaPolicy | null }>> {
  const items = await queryGsi2<TicketItem>("OPEN_SLA");
  const result: Array<Ticket & { slaPolicy?: SlaPolicy | null }> = [];
  for (const item of items) {
    const ticket = stripTicket(item);
    if (ticket.slaBreached) continue;
    const sla = ticket.slaPolicyId
      ? await getSlaPolicy(ticket.workspaceId, ticket.slaPolicyId)
      : null;
    result.push({ ...ticket, slaPolicy: sla });
  }
  return result;
}

export async function enrichTicketSummary(ticket: Ticket) {
  const assignee = ticket.assigneeId ? await getUserById(ticket.assigneeId) : null;
  const tags = await getTicketTags(ticket.id);
  const comments = await getTicketComments(ticket.id);
  return {
    ticket,
    assignee: assignee ? toUserPublic(assignee) : null,
    tags,
    commentCount: comments.length,
  };
}

export async function enrichTicketDetail(ticket: Ticket) {
  const summary = await enrichTicketSummary(ticket);
  const inbox = ticket.inboxId ? await getInboxById(ticket.workspaceId, ticket.inboxId) : null;
  const slaPolicy = ticket.slaPolicyId
    ? await getSlaPolicy(ticket.workspaceId, ticket.slaPolicyId)
    : null;
  const comments = await getTicketComments(ticket.id);
  const events = await getTicketEvents(ticket.id);
  const enrichedComments = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      author: c.authorId ? toUserPublic((await getUserById(c.authorId))!) : null,
    })),
  );
  return {
    ...summary,
    inbox: inbox ? { id: inbox.id, name: inbox.name, email: inbox.email } : null,
    slaPolicy,
    comments: enrichedComments,
    events,
  };
}

function stripTicket(item: TicketItem): Ticket {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    inboxId: item.inboxId,
    number: item.number,
    subject: item.subject,
    status: item.status,
    priority: item.priority,
    requesterEmail: item.requesterEmail,
    requesterName: item.requesterName,
    assigneeId: item.assigneeId,
    slaPolicyId: item.slaPolicyId,
    slaBreached: item.slaBreached,
    firstResponseAt: item.firstResponseAt,
    resolvedAt: item.resolvedAt,
    closedAt: item.closedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function stripInbox(item: InboxItem | null): Inbox {
  if (!item) throw new Error("Inbox not found");
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    email: item.email,
    channel: item.channel,
    isDefault: item.isDefault,
    autoResponderEnabled: item.autoResponderEnabled,
    autoResponderMessage: item.autoResponderMessage,
    businessHoursStart: item.businessHoursStart,
    businessHoursEnd: item.businessHoursEnd,
    routingRules: (item.routingRules as RoutingRule[]) ?? [],
    createdAt: item.createdAt,
  };
}

function stripSla(item: SlaItem | null): SlaPolicy {
  if (!item) throw new Error("SLA not found");
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    firstResponseMinutes: item.firstResponseMinutes,
    resolutionMinutes: item.resolutionMinutes,
    priority: item.priority,
    isDefault: item.isDefault,
  };
}

function stripTag(item: TagItem): Tag {
  return { id: item.id, workspaceId: item.workspaceId, name: item.name, color: item.color };
}

function stripComment(item: CommentItem): TicketComment {
  return {
    id: item.id,
    ticketId: item.ticketId,
    authorId: item.authorId,
    body: item.body,
    visibility: item.visibility,
    isEmail: item.isEmail,
    createdAt: item.createdAt,
  };
}

function stripEvent(item: EventItem): TicketEvent {
  return {
    id: item.id,
    ticketId: item.ticketId,
    actorId: item.actorId,
    eventType: item.eventType,
    payload: item.payload,
    createdAt: item.createdAt,
  };
}

export {
  stripInbox,
  stripSla,
  stripTag,
  stripTicket,
  workspacePk,
};
