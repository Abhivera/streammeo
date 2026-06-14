import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  countWorkspaceAdmins,
  createMembership,
  createTeamInvite,
  deleteTeamInvite,
  findValidTeamInvite,
  getMembership,
  getUserByEmail,
  getUserById,
  getWorkspaceById,
  markTeamInviteAccepted,
  removeMembership,
  updateMembershipRole,
} from "@streammeo/db";
import type { AppConfig } from "../config.js";
import { hashOpaqueToken, sessionWorkspace } from "../auth/session.js";
import { createAuthHook, requireRole, signToken } from "../auth/middleware.js";
import { sendOutboundEmail } from "../email/routes.js";
import {
  INVITE_TTL_MS,
  addDirectMember,
  assertCanAddEmail,
  assertSeatForInviteAccept,
  assertSeatForNewMember,
  getTeamRoster,
  inviteAcceptUrl,
  inviteEmailBody,
  resolveUserForInvite,
  toPublicUser,
  toSessionUser,
  userNeedsPassword,
  type TeamServiceError,
} from "./service.js";

const teamMemberInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["manager", "agent"]),
});

const addMemberSchema = teamMemberInputSchema.extend({
  password: z.string().min(8).optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(["admin", "manager", "agent"]),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).optional(),
});

function serviceError(
  reply: { code: (n: number) => { send: (body: unknown) => unknown } },
  err: TeamServiceError,
) {
  return reply.code(err.status).send({ error: err.error });
}

export async function registerTeamRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);
  const adminOnly = [auth, requireRole("admin")];
  const adminOrManager = [auth, requireRole("admin", "manager")];

  app.get("/api/v1/team/members", { preHandler: adminOrManager }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });

    const workspace = await getWorkspaceById(request.auth.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const roster = await getTeamRoster(request.auth.workspaceId, workspace.plan);
    return {
      items: roster.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      invites: roster.invites.map((i) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
      seatsUsed: roster.seatsUsed,
      seatsLimit: roster.seatsLimit,
    };
  });

  app.post("/api/v1/team/invites", { preHandler: adminOnly }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });

    const body = teamMemberInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const workspace = await getWorkspaceById(request.auth.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const seatCheck = await assertSeatForNewMember(request.auth.workspaceId, workspace.plan);
    if (!seatCheck.ok) return serviceError(reply, seatCheck);

    const email = body.data.email.toLowerCase();
    const memberCheck = await assertCanAddEmail(request.auth.workspaceId, email);
    if (!memberCheck.ok) return serviceError(reply, memberCheck);

    const rawToken = randomBytes(32).toString("hex");
    const invite = await createTeamInvite({
      workspaceId: request.auth.workspaceId,
      email,
      name: body.data.name,
      role: body.data.role,
      invitedByUserId: request.auth.userId,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    });

    const inviter = await getUserById(request.auth.userId);
    const inviteUrl = inviteAcceptUrl(config.FRONTEND_URL, rawToken);

    let emailSent = false;
    try {
      const result = await sendOutboundEmail(config, {
        to: email,
        from: "noreply@streammeo.local",
        subject: `You're invited to join ${workspace.name} on Streammeo`,
        body: inviteEmailBody({
          inviterName: inviter?.name ?? inviter?.email ?? "Your admin",
          workspaceName: workspace.name,
          role: body.data.role,
          inviteUrl,
        }),
      });
      emailSent = result.sent;
      if (!result.sent) {
        request.log.info({ inviteUrl, email }, "Team invite link (email not configured)");
      }
    } catch (err) {
      request.log.error({ err }, "Failed to send team invite email");
    }

    return reply.code(201).send({
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      expiresAt: invite.expiresAt,
      emailSent,
      inviteUrl: emailSent ? undefined : inviteUrl,
    });
  });

  app.delete("/api/v1/team/invites/:inviteId", { preHandler: adminOnly }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });

    const { inviteId } = request.params as { inviteId: string };
    const deleted = await deleteTeamInvite(request.auth.workspaceId, inviteId);
    if (!deleted) return reply.code(404).send({ error: "Invite not found" });
    return { ok: true };
  });

  app.get("/api/v1/team/invites/preview", async (request, reply) => {
    const token = (request.query as { token?: string }).token;
    if (!token) return reply.code(400).send({ error: "Missing invite token" });

    const invite = await findValidTeamInvite(hashOpaqueToken(token));
    if (!invite) return reply.code(400).send({ error: "Invalid or expired invite" });

    const workspace = await getWorkspaceById(invite.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const user = await getUserByEmail(invite.email);
    return {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      workspaceName: workspace.name,
      expiresAt: invite.expiresAt,
      needsPassword: userNeedsPassword(user),
      hasAccount: Boolean(user),
    };
  });

  app.post("/api/v1/team/invites/accept", async (request, reply) => {
    const body = acceptInviteSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const invite = await findValidTeamInvite(hashOpaqueToken(body.data.token));
    if (!invite) return reply.code(400).send({ error: "Invalid or expired invite" });

    const workspace = await getWorkspaceById(invite.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const seatCheck = await assertSeatForInviteAccept(invite.workspaceId, workspace.plan);
    if (!seatCheck.ok) return serviceError(reply, seatCheck);

    const userResult = await resolveUserForInvite(invite, body.data.password);
    if (!userResult.ok) return serviceError(reply, userResult);

    await createMembership({
      workspaceId: invite.workspaceId,
      userId: userResult.user.id,
      role: invite.role,
    });
    await markTeamInviteAccepted(invite.workspaceId, invite.id);

    const token = signToken(
      {
        userId: userResult.user.id,
        workspaceId: invite.workspaceId,
        email: userResult.user.email,
        role: invite.role,
      },
      config.JWT_SECRET,
    );

    return {
      token,
      user: toSessionUser(userResult.user, invite.role),
      workspace: sessionWorkspace(workspace),
    };
  });

  app.post("/api/v1/team/members", { preHandler: adminOnly }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });

    const body = addMemberSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const workspace = await getWorkspaceById(request.auth.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const seatCheck = await assertSeatForNewMember(request.auth.workspaceId, workspace.plan);
    if (!seatCheck.ok) return serviceError(reply, seatCheck);

    const email = body.data.email.toLowerCase();
    const memberCheck = await assertCanAddEmail(request.auth.workspaceId, email);
    if (!memberCheck.ok) return serviceError(reply, memberCheck);

    const result = await addDirectMember({
      workspaceId: request.auth.workspaceId,
      email,
      name: body.data.name,
      role: body.data.role,
      password: body.data.password,
    });
    if (!result.ok) return serviceError(reply, result);

    return reply.code(201).send({
      id: result.memberId,
      userId: result.userId,
      role: result.role,
      user: toPublicUser(result.user),
      isNewUser: result.isNewUser,
    });
  });

  app.patch("/api/v1/team/members/:userId", { preHandler: adminOnly }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });

    const { userId } = request.params as { userId: string };
    const body = updateMemberSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await getMembership(userId, request.auth.workspaceId);
    if (!existing) return reply.code(404).send({ error: "Team member not found" });

    if (existing.role === "admin" && body.data.role !== "admin") {
      const adminCount = await countWorkspaceAdmins(request.auth.workspaceId);
      if (adminCount <= 1) {
        return reply.code(400).send({ error: "Cannot change role of the last admin" });
      }
    }

    const updated = await updateMembershipRole(request.auth.workspaceId, userId, body.data.role);
    if (!updated) return reply.code(404).send({ error: "Team member not found" });

    return { userId: updated.userId, role: updated.role };
  });

  app.delete("/api/v1/team/members/:userId", { preHandler: adminOnly }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });

    const { userId } = request.params as { userId: string };
    const existing = await getMembership(userId, request.auth.workspaceId);
    if (!existing) return reply.code(404).send({ error: "Team member not found" });

    if (userId === request.auth.userId) {
      return reply.code(400).send({ error: "You cannot remove yourself from the team" });
    }

    if (existing.role === "admin") {
      const adminCount = await countWorkspaceAdmins(request.auth.workspaceId);
      if (adminCount <= 1) {
        return reply.code(400).send({ error: "Cannot remove the last admin" });
      }
    }

    await removeMembership(request.auth.workspaceId, userId);
    return { ok: true };
  });
}
