import type {
  CommentVisibility,
  TicketPriority,
  TicketStatus,
} from "@streammeo/db";
import {
  addTicketTags,
  createTicketComment,
  createTicketEvent,
  createTicketRecord,
  deleteTickets,
  enrichTicketDetail,
  enrichTicketSummary,
  getDefaultInbox,
  getDefaultSlaPolicy,
  getTicket,
  listTickets as listTicketsDb,
  type TicketListFilters,
  updateTicketRecord,
} from "@streammeo/db";
import { getWorkspaceById } from "@streammeo/db";
import { createPortalToken as createPortalTokenDb } from "@streammeo/db";
import { canTransitionTicketStatus } from "@streammeo/shared";

export type { TicketListFilters };

export async function listTickets(filters: TicketListFilters) {
  const { items, nextCursor } = await listTicketsDb(filters);
  const enriched = await Promise.all(items.map((t) => enrichTicketSummary(t)));
  return {
    items: enriched.map((e) => mapTicketSummary(e)),
    nextCursor,
  };
}

export async function getTicketById(workspaceId: string, ticketId: string) {
  const ticket = await getTicket(workspaceId, ticketId);
  if (!ticket) return null;
  const detail = await enrichTicketDetail(ticket);
  return mapTicketDetail(detail);
}

export async function createTicket(input: {
  workspaceId: string;
  inboxId?: string;
  subject: string;
  body: string;
  requesterEmail: string;
  requesterName?: string;
  priority?: TicketPriority;
  actorId?: string;
}) {
  const workspace = await getWorkspaceById(input.workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ticketsUsed >= workspace.ticketsLimit) {
    throw new Error("Monthly ticket limit reached");
  }

  const defaultInbox = input.inboxId ?? (await getDefaultInbox(input.workspaceId))?.id ?? null;
  const defaultSla = await getDefaultSlaPolicy(input.workspaceId);

  const ticket = await createTicketRecord({
    workspaceId: input.workspaceId,
    inboxId: defaultInbox,
    slaPolicyId: defaultSla?.id ?? null,
    subject: input.subject,
    requesterEmail: input.requesterEmail,
    requesterName: input.requesterName,
    priority: input.priority,
  });

  await createTicketComment({
    ticketId: ticket.id,
    authorId: input.actorId,
    body: input.body,
    visibility: "public",
    isEmail: true,
  });

  await createTicketEvent({
    ticketId: ticket.id,
    actorId: input.actorId,
    eventType: "ticket.created",
    payload: { channel: "api" },
  });

  return getTicketById(input.workspaceId, ticket.id);
}

export async function updateTicket(
  workspaceId: string,
  ticketId: string,
  actorId: string,
  patch: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
    subject?: string;
  },
) {
  const existing = await getTicket(workspaceId, ticketId);
  if (!existing) return null;

  if (patch.status && !canTransitionTicketStatus(existing.status, patch.status)) {
    throw new Error(`Invalid status transition: ${existing.status} → ${patch.status}`);
  }

  const now = new Date().toISOString();
  const updates: Parameters<typeof updateTicketRecord>[2] = {
    updatedAt: now,
    ...(patch.subject ? { subject: patch.subject } : {}),
    ...(patch.priority ? { priority: patch.priority } : {}),
    ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
    ...(patch.status
      ? {
          status: patch.status,
          ...(patch.status === "resolved" ? { resolvedAt: now } : {}),
          ...(patch.status === "closed" ? { closedAt: now } : {}),
          ...(patch.status === "open" && existing.status === "new"
            ? { firstResponseAt: existing.firstResponseAt ?? now }
            : {}),
        }
      : {}),
  };

  if (patch.status && patch.status !== existing.status) {
    await createTicketEvent({
      ticketId,
      actorId,
      eventType: "ticket.status_changed",
      payload: { from: existing.status, to: patch.status },
    });
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId) {
    await createTicketEvent({
      ticketId,
      actorId,
      eventType: "ticket.assigned",
      payload: { assigneeId: patch.assigneeId },
    });
  }
  if (patch.priority && patch.priority !== existing.priority) {
    await createTicketEvent({
      ticketId,
      actorId,
      eventType: "ticket.priority_changed",
      payload: { from: existing.priority, to: patch.priority },
    });
  }

  await updateTicketRecord(workspaceId, ticketId, updates);
  return getTicketById(workspaceId, ticketId);
}

export async function addComment(input: {
  workspaceId: string;
  ticketId: string;
  authorId?: string;
  body: string;
  visibility: CommentVisibility;
  isEmail?: boolean;
}) {
  const ticket = await getTicket(input.workspaceId, input.ticketId);
  if (!ticket) return null;

  const now = new Date().toISOString();
  const shouldOpen =
    ticket.status === "new" || (ticket.status === "pending" && input.visibility === "public");

  const comment = await createTicketComment({
    ticketId: input.ticketId,
    authorId: input.authorId,
    body: input.body,
    visibility: input.visibility,
    isEmail: input.isEmail ?? input.visibility === "public",
  });

  await updateTicketRecord(input.workspaceId, input.ticketId, {
    updatedAt: now,
    ...(shouldOpen ? { status: "open", firstResponseAt: ticket.firstResponseAt ?? now } : {}),
  });

  await createTicketEvent({
    ticketId: input.ticketId,
    actorId: input.authorId,
    eventType: input.visibility === "internal" ? "comment.internal" : "comment.public",
    payload: { commentId: comment.id },
  });

  const author = comment.authorId
    ? (await enrichTicketDetail(ticket)).comments.find((c) => c.id === comment.id)?.author ?? null
    : null;

  return { ...comment, author };
}

export async function bulkUpdateTickets(
  workspaceId: string,
  actorId: string,
  ticketIds: string[],
  patch: {
    status?: TicketStatus;
    assigneeId?: string | null;
    tagIds?: string[];
    delete?: boolean;
  },
) {
  if (patch.delete) {
    const deleted = await deleteTickets(workspaceId, ticketIds);
    return { deleted, tickets: [] as ReturnType<typeof mapTicketDetail>[] };
  }

  const results = [];
  for (const id of ticketIds) {
    const updated = await updateTicket(workspaceId, id, actorId, {
      status: patch.status,
      assigneeId: patch.assigneeId,
    });
    if (updated && patch.tagIds?.length) {
      await addTicketTags(id, workspaceId, patch.tagIds);
    }
    if (updated) results.push(updated);
  }
  return { deleted: 0, tickets: results };
}

export async function createPortalToken(ticketId: string): Promise<string> {
  return createPortalTokenDb(ticketId);
}

function mapTicketSummary(e: Awaited<ReturnType<typeof enrichTicketSummary>>) {
  return {
    id: e.ticket.id,
    number: e.ticket.number,
    subject: e.ticket.subject,
    status: e.ticket.status,
    priority: e.ticket.priority,
    requesterEmail: e.ticket.requesterEmail,
    requesterName: e.ticket.requesterName,
    slaBreached: e.ticket.slaBreached,
    createdAt: e.ticket.createdAt,
    updatedAt: e.ticket.updatedAt,
    assignee: e.assignee,
    tags: e.tags,
    commentCount: e.commentCount,
  };
}

function mapTicketDetail(e: Awaited<ReturnType<typeof enrichTicketDetail>>) {
  return {
    ...mapTicketSummary(e),
    firstResponseAt: e.ticket.firstResponseAt,
    resolvedAt: e.ticket.resolvedAt,
    closedAt: e.ticket.closedAt,
    inbox: e.inbox,
    slaPolicy: e.slaPolicy,
    comments: e.comments.map((c) => ({
      id: c.id,
      body: c.body,
      visibility: c.visibility,
      isEmail: c.isEmail,
      createdAt: c.createdAt,
      author: c.author,
    })),
    events: e.events.map((ev) => ({
      id: ev.id,
      eventType: ev.eventType,
      payload: ev.payload,
      createdAt: ev.createdAt,
    })),
  };
}
