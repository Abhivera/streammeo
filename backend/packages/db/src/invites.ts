import type { MemberRole, TeamInvite } from "./types.js";
import {
  deleteItem,
  getItem,
  newId,
  nowIso,
  putItem,
  queryGsi1,
  queryPk,
  updateItem,
  type DbItem,
} from "./store.js";

type InviteItem = DbItem & TeamInvite & { entityType: "team_invite" };

function workspacePk(workspaceId: string) {
  return `WORKSPACE#${workspaceId}`;
}

function isInvitePending(invite: TeamInvite): boolean {
  return !invite.acceptedAt && invite.expiresAt > nowIso();
}

export async function createTeamInvite(input: {
  workspaceId: string;
  email: string;
  name: string;
  role: MemberRole;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: string;
}): Promise<TeamInvite> {
  const id = newId();
  const invite: TeamInvite = {
    id,
    workspaceId: input.workspaceId,
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role,
    invitedByUserId: input.invitedByUserId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    acceptedAt: null,
    createdAt: nowIso(),
  };

  const item: InviteItem = {
    pk: workspacePk(input.workspaceId),
    sk: `INVITE#${id}`,
    entityType: "team_invite",
    gsi1pk: `INVITE#${input.tokenHash}`,
    gsi1sk: `WORKSPACE#${input.workspaceId}`,
    ...invite,
  };

  await putItem(item);
  return invite;
}

export async function findValidTeamInvite(tokenHash: string): Promise<TeamInvite | null> {
  const { items } = await queryGsi1<InviteItem>(`INVITE#${tokenHash}`);
  const invite = items[0];
  if (!invite || invite.acceptedAt || invite.expiresAt <= nowIso()) return null;
  return stripInvite(invite);
}

export async function listPendingTeamInvites(workspaceId: string): Promise<TeamInvite[]> {
  const items = await queryPk<InviteItem>(workspacePk(workspaceId), "INVITE#");
  return items.map(stripInvite).filter(isInvitePending);
}

export async function getPendingInviteForEmail(
  workspaceId: string,
  email: string,
): Promise<TeamInvite | null> {
  const normalized = email.toLowerCase();
  return (await listPendingTeamInvites(workspaceId)).find((i) => i.email === normalized) ?? null;
}

export async function getTeamInviteById(
  workspaceId: string,
  inviteId: string,
): Promise<TeamInvite | null> {
  const item = await getItem<InviteItem>(workspacePk(workspaceId), `INVITE#${inviteId}`);
  if (!item) return null;
  return stripInvite(item);
}

export async function markTeamInviteAccepted(workspaceId: string, inviteId: string): Promise<void> {
  await updateItem(
    workspacePk(workspaceId),
    `INVITE#${inviteId}`,
    "SET #acceptedAt = :acceptedAt",
    { "#acceptedAt": "acceptedAt" },
    { ":acceptedAt": nowIso() },
  );
}

export async function deleteTeamInvite(workspaceId: string, inviteId: string): Promise<boolean> {
  const existing = await getTeamInviteById(workspaceId, inviteId);
  if (!existing || !isInvitePending(existing)) return false;
  await deleteItem(workspacePk(workspaceId), `INVITE#${inviteId}`);
  return true;
}

function stripInvite(item: InviteItem): TeamInvite {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    email: item.email,
    name: item.name,
    role: item.role,
    invitedByUserId: item.invitedByUserId,
    tokenHash: item.tokenHash,
    expiresAt: item.expiresAt,
    acceptedAt: item.acceptedAt,
    createdAt: item.createdAt,
  };
}
