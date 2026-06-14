import bcrypt from "bcryptjs";
import { PLANS, type PlanId } from "@streammeo/shared";
import type { TeamInvite, User } from "@streammeo/db";
import {
  countWorkspaceMembers,
  createMembership,
  createUser,
  getMembership,
  getPendingInviteForEmail,
  getUserByEmail,
  listPendingTeamInvites,
  listWorkspaceMembers,
  updateUser,
} from "@streammeo/db";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type TeamServiceError = { ok: false; status: number; error: string };
export type TeamServiceOk = { ok: true };

export function workspacePlan(planId: string) {
  return PLANS[planId as PlanId] ?? PLANS.starter;
}

export function memberRoleLabel(role: string): string {
  return role === "manager" ? "Manager" : role === "agent" ? "Agent" : "Admin";
}

export function userNeedsPassword(user: User | null): boolean {
  return !user || (!user.password && !user.firebaseUid);
}

export async function getTeamRoster(workspaceId: string, planId: string) {
  const plan = workspacePlan(planId);
  const [members, invites] = await Promise.all([
    listWorkspaceMembers(workspaceId),
    listPendingTeamInvites(workspaceId),
  ]);

  return {
    members,
    invites,
    seatsUsed: members.length + invites.length,
    seatsLimit: plan.agentsLimit,
  };
}

export async function assertSeatForNewMember(
  workspaceId: string,
  planId: string,
): Promise<TeamServiceOk | TeamServiceError> {
  const plan = workspacePlan(planId);
  const [memberCount, pendingCount] = await Promise.all([
    countWorkspaceMembers(workspaceId),
    listPendingTeamInvites(workspaceId).then((items) => items.length),
  ]);

  if (memberCount + pendingCount >= plan.agentsLimit) {
    return {
      ok: false,
      status: 403,
      error: `Team seat limit reached (${plan.agentsLimit} on ${plan.name} plan). Upgrade to add more members.`,
    };
  }
  return { ok: true };
}

export async function assertCanAddEmail(
  workspaceId: string,
  email: string,
): Promise<TeamServiceOk | TeamServiceError> {
  const normalized = email.toLowerCase();
  const user = await getUserByEmail(normalized);
  if (user) {
    const membership = await getMembership(user.id, workspaceId);
    if (membership) {
      return { ok: false, status: 409, error: "This person is already on your team" };
    }
  }

  if (await getPendingInviteForEmail(workspaceId, normalized)) {
    return { ok: false, status: 409, error: "An invite is already pending for this email" };
  }

  return { ok: true };
}

export async function assertSeatForInviteAccept(
  workspaceId: string,
  planId: string,
): Promise<TeamServiceOk | TeamServiceError> {
  const plan = workspacePlan(planId);
  const memberCount = await countWorkspaceMembers(workspaceId);
  if (memberCount >= plan.agentsLimit) {
    return {
      ok: false,
      status: 403,
      error: "This workspace has no available seats. Ask your admin to upgrade.",
    };
  }
  return { ok: true };
}

export async function resolveUserForInvite(
  invite: TeamInvite,
  password?: string,
): Promise<{ ok: true; user: User } | TeamServiceError> {
  let user = await getUserByEmail(invite.email);

  if (user) {
    const existing = await getMembership(user.id, invite.workspaceId);
    if (existing) {
      return { ok: false, status: 409, error: "You are already on this team" };
    }
  } else if (!password) {
    return { ok: false, status: 400, error: "Set a password to create your account" };
  } else {
    user = await createUser({
      email: invite.email,
      password: await bcrypt.hash(password, 10),
      name: invite.name,
    });
    return { ok: true, user };
  }

  if (userNeedsPassword(user) && !password) {
    return { ok: false, status: 400, error: "Set a password to finish joining" };
  }

  if (userNeedsPassword(user) && password) {
    const updated = await updateUser(user.id, { password: await bcrypt.hash(password, 10) });
    user = updated ?? user;
  }

  return { ok: true, user };
}

export async function addDirectMember(input: {
  workspaceId: string;
  email: string;
  name: string;
  role: "manager" | "agent";
  password?: string;
}): Promise<
  | { ok: true; memberId: string; userId: string; role: string; user: User; isNewUser: boolean }
  | TeamServiceError
> {
  const email = input.email.toLowerCase();
  let user = await getUserByEmail(email);
  let isNewUser = false;

  if (!user) {
    if (!input.password) {
      return {
        ok: false,
        status: 400,
        error: "Set a temporary password so they can sign in with email and password",
      };
    }
    user = await createUser({
      email,
      password: await bcrypt.hash(input.password, 10),
      name: input.name,
    });
    isNewUser = true;
  }

  const member = await createMembership({
    workspaceId: input.workspaceId,
    userId: user.id,
    role: input.role,
  });

  return {
    ok: true,
    memberId: member.id,
    userId: member.userId,
    role: member.role,
    user,
    isNewUser,
  };
}

export function inviteAcceptUrl(frontendUrl: string, rawToken: string): string {
  return `${frontendUrl}/accept-invite?token=${rawToken}`;
}

export function inviteEmailBody(input: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}): string {
  return [
    `${input.inviterName} invited you to join ${input.workspaceName} on Streammeo as a ${memberRoleLabel(input.role)}.`,
    "",
    `Accept your invite: ${input.inviteUrl}`,
    "",
    "This link expires in 7 days.",
  ].join("\n");
}

export function toSessionUser(user: User, role: string) {
  return { id: user.id, email: user.email, name: user.name, role };
}

export function toPublicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name };
}
