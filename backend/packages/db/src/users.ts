import type { MemberRole, PasswordResetToken, User, UserPublic, WorkspaceMember } from "./types.js";
import {
  getItem,
  newId,
  nowIso,
  putItem,
  queryGsi1,
  queryPk,
  transactWrite,
  updateItem,
  type DbItem,
} from "./store.js";

type UserItem = DbItem & User & { entityType: "user" };
type EmailLookupItem = DbItem & { entityType: "email_lookup"; email: string; userId: string };
type ResetItem = DbItem & PasswordResetToken & { entityType: "password_reset" };
type MemberItem = DbItem & WorkspaceMember & { entityType: "workspace_member" };

function userPk(id: string) {
  return `USER#${id}`;
}

export function toUserPublic(user: User): UserPublic {
  return { id: user.id, email: user.email, name: user.name };
}

export async function getUserById(id: string): Promise<User | null> {
  const item = await getItem<UserItem>(userPk(id), "PROFILE");
  if (!item) return null;
  return stripUser(item);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { items } = await queryGsi1<EmailLookupItem>(`EMAIL#${email.toLowerCase()}`);
  const lookup = items[0];
  if (!lookup) return null;
  return getUserById(lookup.userId);
}

export async function getUserByFirebaseUidOrEmail(
  firebaseUid: string,
  email: string,
): Promise<User | null> {
  const { items } = await queryGsi1<EmailLookupItem>(`FIREBASE#${firebaseUid}`);
  if (items[0]?.userId) return getUserById(items[0].userId);
  return getUserByEmail(email);
}

export async function createUser(input: {
  email: string;
  password?: string | null;
  name?: string | null;
  firebaseUid?: string | null;
}): Promise<User> {
  const id = newId();
  const createdAt = nowIso();
  const user: User = {
    id,
    email: input.email.toLowerCase(),
    password: input.password ?? null,
    name: input.name ?? null,
    firebaseUid: input.firebaseUid ?? null,
    createdAt,
  };

  const writes: Array<{ Put: DbItem }> = [
    { Put: { pk: userPk(id), sk: "PROFILE", entityType: "user", ...user } },
    {
      Put: {
        pk: `EMAIL#${user.email}`,
        sk: `USER#${id}`,
        entityType: "email_lookup",
        gsi1pk: `EMAIL#${user.email}`,
        gsi1sk: `USER#${id}`,
        email: user.email,
        userId: id,
      },
    },
  ];

  if (user.firebaseUid) {
    writes.push({
      Put: {
        pk: `FIREBASE#${user.firebaseUid}`,
        sk: `USER#${id}`,
        entityType: "firebase_lookup",
        gsi1pk: `FIREBASE#${user.firebaseUid}`,
        gsi1sk: `USER#${id}`,
        userId: id,
      },
    });
  }

  await transactWrite(writes);
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "password" | "name" | "firebaseUid">>,
): Promise<User | null> {
  const existing = await getUserById(id);
  if (!existing) return null;

  const updated: User = { ...existing, ...patch };
  const writes: Array<{ Put: DbItem }> = [
    { Put: { pk: userPk(id), sk: "PROFILE", entityType: "user", ...updated } },
  ];

  if (patch.firebaseUid && patch.firebaseUid !== existing.firebaseUid) {
    writes.push({
      Put: {
        pk: `FIREBASE#${patch.firebaseUid}`,
        sk: `USER#${id}`,
        entityType: "firebase_lookup",
        gsi1pk: `FIREBASE#${patch.firebaseUid}`,
        gsi1sk: `USER#${id}`,
        userId: id,
      },
    });
  }

  await transactWrite(writes);
  return updated;
}

export async function createPasswordResetToken(userId: string, tokenHash: string): Promise<void> {
  const id = newId();
  const item: ResetItem = {
    pk: userPk(userId),
    sk: `RESET#${id}`,
    entityType: "password_reset",
    gsi1pk: `RESET#${tokenHash}`,
    gsi1sk: `USER#${userId}`,
    id,
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    usedAt: null,
    createdAt: nowIso(),
  };
  await putItem(item);
}

export async function findValidPasswordResetToken(
  tokenHash: string,
): Promise<(PasswordResetToken & { user: User }) | null> {
  const { items } = await queryGsi1<ResetItem>(`RESET#${tokenHash}`);
  const reset = items[0];
  if (!reset || reset.usedAt || reset.expiresAt <= nowIso()) return null;
  const user = await getUserById(reset.userId);
  if (!user) return null;
  return { ...reset, user };
}

export async function markPasswordResetUsed(userId: string, resetId: string): Promise<void> {
  await updateItem(
    userPk(userId),
    `RESET#${resetId}`,
    "SET #usedAt = :usedAt",
    { "#usedAt": "usedAt" },
    { ":usedAt": nowIso() },
  );
}

export async function getUserMemberships(userId: string): Promise<
  Array<WorkspaceMember & { workspaceId: string }>
> {
  const items = await queryPk<MemberItem>(userPk(userId), "MEMBER#");
  return items.map((m) => ({
    id: m.id,
    workspaceId: m.workspaceId,
    userId: m.userId,
    role: m.role,
  }));
}

export async function getMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMember | null> {
  const item = await getItem<MemberItem>(userPk(userId), `MEMBER#${workspaceId}`);
  if (!item) return null;
  return { id: item.id, workspaceId: item.workspaceId, userId: item.userId, role: item.role };
}

export type WorkspaceMemberWithUser = WorkspaceMember & {
  user: UserPublic;
};

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithUser[]> {
  const items = await queryPk<MemberItem>(`WORKSPACE#${workspaceId}`, "MEMBER#");
  const members = await Promise.all(
    items.map(async (item) => {
      const user = await getUserById(item.userId);
      if (!user) return null;
      return {
        id: item.id,
        workspaceId: item.workspaceId,
        userId: item.userId,
        role: item.role,
        user: toUserPublic(user),
      };
    }),
  );
  return members.filter((m): m is WorkspaceMemberWithUser => m !== null);
}

export async function countWorkspaceMembers(workspaceId: string): Promise<number> {
  const items = await queryPk<MemberItem>(`WORKSPACE#${workspaceId}`, "MEMBER#");
  return items.length;
}

export async function countWorkspaceAdmins(workspaceId: string): Promise<number> {
  const items = await queryPk<MemberItem>(`WORKSPACE#${workspaceId}`, "MEMBER#");
  return items.filter((m) => m.role === "admin").length;
}

export async function updateMembershipRole(
  workspaceId: string,
  userId: string,
  role: MemberRole,
): Promise<WorkspaceMember | null> {
  const existing = await getMembership(userId, workspaceId);
  if (!existing) return null;

  const updated: WorkspaceMember = { ...existing, role };
  await transactWrite([
    {
      Put: {
        pk: `WORKSPACE#${workspaceId}`,
        sk: `MEMBER#${userId}`,
        entityType: "workspace_member",
        ...updated,
      },
    },
    {
      Put: {
        pk: userPk(userId),
        sk: `MEMBER#${workspaceId}`,
        entityType: "workspace_member",
        ...updated,
      },
    },
  ]);
  return updated;
}

export async function removeMembership(workspaceId: string, userId: string): Promise<boolean> {
  const existing = await getMembership(userId, workspaceId);
  if (!existing) return false;

  await transactWrite([
    { Delete: { pk: `WORKSPACE#${workspaceId}`, sk: `MEMBER#${userId}` } },
    { Delete: { pk: userPk(userId), sk: `MEMBER#${workspaceId}` } },
  ]);
  return true;
}

export async function createMembership(input: {
  workspaceId: string;
  userId: string;
  role: MemberRole;
}): Promise<WorkspaceMember> {
  const id = newId();
  const member: WorkspaceMember = {
    id,
    workspaceId: input.workspaceId,
    userId: input.userId,
    role: input.role,
  };

  await transactWrite([
    {
      Put: {
        pk: `WORKSPACE#${input.workspaceId}`,
        sk: `MEMBER#${input.userId}`,
        entityType: "workspace_member",
        ...member,
      },
    },
    {
      Put: {
        pk: userPk(input.userId),
        sk: `MEMBER#${input.workspaceId}`,
        entityType: "workspace_member",
        ...member,
      },
    },
  ]);

  return member;
}

function stripUser(item: UserItem): User {
  return {
    id: item.id,
    email: item.email,
    password: item.password,
    name: item.name,
    firebaseUid: item.firebaseUid,
    createdAt: item.createdAt,
  };
}
