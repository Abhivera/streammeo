import type { Prisma } from "@prisma/client";
import type {
  CommentVisibility,
  TicketPriority,
  TicketStatus,
} from "@streammeo/db";
import { prisma } from "../db.js";
import { canTransitionTicketStatus } from "@streammeo/shared";

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

export async function getNextTicketNumber(workspaceId: string): Promise<number> {
  const last = await prisma.ticket.findFirst({
    where: { workspaceId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 1000) + 1;
}

export async function listTickets(filters: TicketListFilters) {
  const limit = Math.min(filters.limit ?? 50, 100);
  const where: Prisma.TicketWhereInput = {
    workspaceId: filters.workspaceId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.search
      ? {
          OR: [
            { subject: { contains: filters.search, mode: "insensitive" } },
            { requesterEmail: { contains: filters.search, mode: "insensitive" } },
            { requesterName: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.tag
      ? { tags: { some: { tag: { name: filters.tag } } } }
      : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    take: limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
    },
  });

  const hasMore = tickets.length > limit;
  const items = hasMore ? tickets.slice(0, limit) : tickets;

  return {
    items: items.map(mapTicketSummary),
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

export async function getTicketById(workspaceId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, workspaceId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      inbox: { select: { id: true, name: true, email: true } },
      slaPolicy: true,
      tags: { include: { tag: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  return ticket ? mapTicketDetail(ticket) : null;
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
  const workspace = await prisma.workspace.findUnique({ where: { id: input.workspaceId } });
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.ticketsUsed >= workspace.ticketsLimit) {
    throw new Error("Monthly ticket limit reached");
  }

  const defaultInbox =
    input.inboxId ??
    (
      await prisma.inbox.findFirst({
        where: { workspaceId: input.workspaceId, isDefault: true },
      })
    )?.id;

  const defaultSla = await prisma.slaPolicy.findFirst({
    where: {
      workspaceId: input.workspaceId,
      isDefault: true,
    },
  });

  const number = await getNextTicketNumber(input.workspaceId);

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        workspaceId: input.workspaceId,
        inboxId: defaultInbox,
        slaPolicyId: defaultSla?.id,
        number,
        subject: input.subject,
        requesterEmail: input.requesterEmail,
        requesterName: input.requesterName,
        priority: input.priority ?? "normal",
        comments: {
          create: {
            body: input.body,
            visibility: "public",
            isEmail: true,
            authorId: input.actorId,
          },
        },
        events: {
          create: {
            eventType: "ticket.created",
            actorId: input.actorId,
            payload: { channel: "api" },
          },
        },
      },
      include: ticketInclude,
    });

    await tx.workspace.update({
      where: { id: input.workspaceId },
      data: { ticketsUsed: { increment: 1 } },
    });

    return created;
  });

  return mapTicketDetail(ticket);
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
  const existing = await prisma.ticket.findFirst({ where: { id: ticketId, workspaceId } });
  if (!existing) return null;

  if (patch.status && !canTransitionTicketStatus(existing.status, patch.status)) {
    throw new Error(`Invalid status transition: ${existing.status} → ${patch.status}`);
  }

  const now = new Date();
  const data: Prisma.TicketUpdateInput = {
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

  const events: Prisma.TicketEventCreateManyInput[] = [];
  if (patch.status && patch.status !== existing.status) {
    events.push({
      ticketId,
      actorId,
      eventType: "ticket.status_changed",
      payload: { from: existing.status, to: patch.status },
    });
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId) {
    events.push({
      ticketId,
      actorId,
      eventType: "ticket.assigned",
      payload: { assigneeId: patch.assigneeId },
    });
  }
  if (patch.priority && patch.priority !== existing.priority) {
    events.push({
      ticketId,
      actorId,
      eventType: "ticket.priority_changed",
      payload: { from: existing.priority, to: patch.priority },
    });
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data,
      include: ticketInclude,
    });
    if (events.length > 0) {
      await tx.ticketEvent.createMany({ data: events });
    }
    return updated;
  });

  return mapTicketDetail(ticket);
}

export async function addComment(input: {
  workspaceId: string;
  ticketId: string;
  authorId?: string;
  body: string;
  visibility: CommentVisibility;
  isEmail?: boolean;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, workspaceId: input.workspaceId },
  });
  if (!ticket) return null;

  const now = new Date();
  const shouldOpen =
    ticket.status === "new" || (ticket.status === "pending" && input.visibility === "public");

  const result = await prisma.$transaction(async (tx) => {
    const comment = await tx.ticketComment.create({
      data: {
        ticketId: input.ticketId,
        authorId: input.authorId,
        body: input.body,
        visibility: input.visibility,
        isEmail: input.isEmail ?? input.visibility === "public",
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await tx.ticket.update({
      where: { id: input.ticketId },
      data: {
        updatedAt: now,
        ...(shouldOpen
          ? { status: "open", firstResponseAt: ticket.firstResponseAt ?? now }
          : {}),
      },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId: input.ticketId,
        actorId: input.authorId,
        eventType: input.visibility === "internal" ? "comment.internal" : "comment.public",
        payload: { commentId: comment.id },
      },
    });

    return comment;
  });

  return result;
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
    const deleted = await prisma.ticket.deleteMany({
      where: { workspaceId, id: { in: ticketIds } },
    });
    return { deleted: deleted.count, tickets: [] as ReturnType<typeof mapTicketDetail>[] };
  }

  const results = [];
  for (const id of ticketIds) {
    const updated = await updateTicket(workspaceId, id, actorId, {
      status: patch.status,
      assigneeId: patch.assigneeId,
    });
    if (updated && patch.tagIds?.length) {
      await prisma.ticketTag.createMany({
        data: patch.tagIds.map((tagId) => ({ ticketId: id, tagId })),
        skipDuplicates: true,
      });
    }
    if (updated) results.push(updated);
  }
  return { deleted: 0, tickets: results };
}

export async function createPortalToken(ticketId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const existing = await prisma.portalToken.findFirst({
    where: { ticketId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.token;

  const token = crypto.randomUUID();
  await prisma.portalToken.create({
    data: { ticketId, token, expiresAt },
  });
  return token;
}

const ticketInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  inbox: { select: { id: true, name: true, email: true } },
  slaPolicy: true,
  tags: { include: { tag: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, name: true, email: true } } },
  },
  events: { orderBy: { createdAt: "asc" as const } },
};

function mapTicketSummary(ticket: {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterEmail: string;
  requesterName: string | null;
  slaBreached: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string | null; email: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  _count: { comments: number };
}) {
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    requesterEmail: ticket.requesterEmail,
    requesterName: ticket.requesterName,
    slaBreached: ticket.slaBreached,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    assignee: ticket.assignee,
    tags: ticket.tags.map((t) => t.tag),
    commentCount: ticket._count.comments,
  };
}

function mapTicketDetail(ticket: {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterEmail: string;
  requesterName: string | null;
  slaBreached: boolean;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string | null; email: string } | null;
  inbox: { id: string; name: string; email: string } | null;
  slaPolicy: {
    id: string;
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
  } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  comments: Array<{
    id: string;
    body: string;
    visibility: CommentVisibility;
    isEmail: boolean;
    createdAt: Date;
    author: { id: string; name: string | null; email: string } | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    payload: unknown;
    createdAt: Date;
  }>;
}) {
  return {
    ...mapTicketSummary({
      ...ticket,
      _count: { comments: ticket.comments.length },
    }),
    firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    inbox: ticket.inbox,
    slaPolicy: ticket.slaPolicy,
    comments: ticket.comments.map((c) => ({
      id: c.id,
      body: c.body,
      visibility: c.visibility,
      isEmail: c.isEmail,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
    events: ticket.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
