import { slugify } from "@streammeo/shared";
import type { Workspace, WorkspaceMember } from "./types.js";
import { DEFAULT_WIDGET_SETTINGS } from "./widget.js";
import { getUserMemberships } from "./users.js";
import {
  getItem,
  newId,
  nowIso,
  putItem,
  queryGsi1,
  transactWrite,
  updateItem,
  type DbItem,
} from "./store.js";
import { createMembership } from "./users.js";

type WorkspaceItem = DbItem & Workspace & { entityType: "workspace" };

function workspacePk(id: string) {
  return `WORKSPACE#${id}`;
}

export function stripWorkspace(item: WorkspaceItem): Workspace {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    apiKey: item.apiKey,
    plan: item.plan,
    ticketsUsed: item.ticketsUsed,
    ticketsLimit: item.ticketsLimit,
    aiRepliesUsed: item.aiRepliesUsed,
    aiRepliesLimit: item.aiRepliesLimit,
    razorpaySubscriptionId: item.razorpaySubscriptionId,
    widgetEnabled: item.widgetEnabled,
    widgetSettings: item.widgetSettings ?? null,
    lastTicketNumber: item.lastTicketNumber ?? 1000,
    createdAt: item.createdAt,
  };
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const item = await getItem<WorkspaceItem>(workspacePk(id), "META");
  return item ? stripWorkspace(item) : null;
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const { items } = await queryGsi1<WorkspaceItem>(`SLUG#${slug}`);
  if (!items[0]) return null;
  return getWorkspaceById(items[0].id);
}

export async function getWorkspaceByApiKey(apiKey: string): Promise<Workspace | null> {
  const { queryGsi2 } = await import("./store.js");
  const items = await queryGsi2<WorkspaceItem>(`APIKEY#${apiKey}`);
  if (!items[0]) return null;
  return getWorkspaceById(items[0].id);
}

export async function createWorkspace(input: {
  name: string;
  slug?: string;
  plan?: string;
  ticketsLimit?: number;
  aiRepliesLimit?: number;
}): Promise<Workspace> {
  const id = newId();
  let slug = input.slug ?? slugify(input.name);
  const existing = await getWorkspaceBySlug(slug);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const apiKey = newId();
  const createdAt = nowIso();
  const workspace: Workspace = {
    id,
    name: input.name,
    slug,
    apiKey,
    plan: input.plan ?? "starter",
    ticketsUsed: 0,
    ticketsLimit: input.ticketsLimit ?? 500,
    aiRepliesUsed: 0,
    aiRepliesLimit: input.aiRepliesLimit ?? 0,
    razorpaySubscriptionId: null,
    widgetEnabled: true,
    widgetSettings: { ...DEFAULT_WIDGET_SETTINGS },
    lastTicketNumber: 1000,
    createdAt,
  };

  const item: WorkspaceItem = {
    pk: workspacePk(id),
    sk: "META",
    entityType: "workspace",
    gsi1pk: `SLUG#${slug}`,
    gsi1sk: `WORKSPACE#${id}`,
    gsi2pk: `APIKEY#${apiKey}`,
    gsi2sk: `WORKSPACE#${id}`,
    ...workspace,
  };

  await putItem(item);
  return workspace;
}

export async function createWorkspaceForUser(input: {
  userId: string;
  workspaceName: string;
}): Promise<Workspace> {
  const workspace = await createWorkspace({ name: input.workspaceName });
  await createMembership({ workspaceId: workspace.id, userId: input.userId, role: "admin" });

  const inboxId = newId();
  const slaId = newId();
  const createdAt = nowIso();

  await transactWrite([
    {
      Put: {
        pk: workspacePk(workspace.id),
        sk: `INBOX#${inboxId}`,
        entityType: "inbox",
        id: inboxId,
        workspaceId: workspace.id,
        name: "Support",
        email: `support@${workspace.slug}.streammeo.local`,
        channel: "email",
        isDefault: true,
        autoResponderEnabled: false,
        autoResponderMessage: null,
        businessHoursStart: null,
        businessHoursEnd: null,
        routingRules: [],
        createdAt,
        gsi1pk: `INBOX_EMAIL#support@${workspace.slug}.streammeo.local`,
        gsi1sk: `WORKSPACE#${workspace.id}#${inboxId}`,
      },
    },
    {
      Put: {
        pk: workspacePk(workspace.id),
        sk: `SLA#${slaId}`,
        entityType: "sla_policy",
        id: slaId,
        workspaceId: workspace.id,
        name: "Standard SLA",
        firstResponseMinutes: 240,
        resolutionMinutes: 1440,
        priority: null,
        isDefault: true,
      },
    },
  ]);

  return workspace;
}

export async function updateWorkspace(
  id: string,
  patch: Partial<
    Pick<
      Workspace,
      | "plan"
      | "ticketsLimit"
      | "aiRepliesLimit"
      | "ticketsUsed"
      | "aiRepliesUsed"
      | "razorpaySubscriptionId"
      | "widgetEnabled"
      | "widgetSettings"
      | "lastTicketNumber"
    >
  >,
): Promise<Workspace | null> {
  const existing = await getWorkspaceById(id);
  if (!existing) return null;

  const updated = { ...existing, ...patch };
  const item = await getItem<WorkspaceItem>(workspacePk(id), "META");
  if (!item) return null;

  await putItem({
    ...item,
    ...updated,
  });
  return updated;
}

export async function incrementWorkspaceCounter(
  id: string,
  field: "ticketsUsed" | "aiRepliesUsed",
  amount = 1,
): Promise<void> {
  await updateItem(
    workspacePk(id),
    "META",
    "SET #field = if_not_exists(#field, :zero) + :inc",
    { "#field": field },
    { ":inc": amount, ":zero": 0 },
  );
}

export async function allocateTicketNumber(workspaceId: string): Promise<number> {
  const { docClient, getTableName } = await import("./client.js");
  const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
  const res = await docClient.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { pk: workspacePk(workspaceId), sk: "META" },
      UpdateExpression:
        "SET lastTicketNumber = if_not_exists(lastTicketNumber, :start) + :inc",
      ExpressionAttributeValues: { ":start": 1000, ":inc": 1 },
      ReturnValues: "ALL_NEW",
    }),
  );
  return (res.Attributes?.lastTicketNumber as number) ?? 1001;
}

export async function getPrimaryMembership(
  userId: string,
): Promise<{ member: WorkspaceMember; workspace: import("./types.js").Workspace } | null> {
  const memberships = await getUserMemberships(userId);
  if (!memberships.length) return null;

  let earliest = memberships[0]!;
  let earliestWs = await getWorkspaceById(earliest.workspaceId);
  for (const m of memberships.slice(1)) {
    const ws = await getWorkspaceById(m.workspaceId);
    if (ws && earliestWs && ws.createdAt < earliestWs.createdAt) {
      earliest = m;
      earliestWs = ws;
    }
  }
  if (!earliestWs) return null;
  return { member: earliest, workspace: earliestWs };
}
