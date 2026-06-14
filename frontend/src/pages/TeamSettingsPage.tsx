import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import {
  AddTeamMemberForm,
  PendingInvitesList,
  TeamAccessDenied,
  TeamMembersList,
  TeamSeatsSummary,
} from "../components/TeamPanels";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  addTeamMember,
  cancelTeamInvite,
  fetchTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "../api/client";
import { apiErrorMessage, isForbidden } from "../lib/apiError";
import { useAuthStore } from "../store/auth";
import type { TeamInviteSummary, TeamMember } from "../types";

type AddMode = "invite" | "direct";

function resetFormFields(
  setEmail: (v: string) => void,
  setName: (v: string) => void,
  setPassword: (v: string) => void,
  setRole: (v: "manager" | "agent") => void,
) {
  setEmail("");
  setName("");
  setPassword("");
  setRole("agent");
}

export function TeamSettingsPage(): ReactElement {
  usePageTitle("Team");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const { data, loading, error, reload } = useAsyncData(() => fetchTeamMembers(), []);
  const [addMode, setAddMode] = useState<AddMode>("invite");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"manager" | "agent">("agent");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);

  if (error && isForbidden(error)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" description="Manage who can access your workspace." />
        <TeamAccessDenied />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!isAdmin) return;

    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      if (addMode === "invite") {
        const result = await inviteTeamMember({ email: email.trim(), name: name.trim(), role });
        setFormSuccess(
          result.emailSent
            ? `Invite sent to ${result.email}. They have 7 days to accept.`
            : `Invite created for ${result.email}. Email is not configured — copy this link: ${result.inviteUrl}`,
        );
      } else {
        const result = await addTeamMember({
          email: email.trim(),
          name: name.trim(),
          role,
          password: password.trim() || undefined,
        });
        setFormSuccess(
          result.isNewUser
            ? `${result.user.email} was added. Share the temporary password so they can sign in at /login.`
            : `${result.user.email} was added to your workspace. They can sign in with their existing account.`,
        );
      }
      resetFormFields(setEmail, setName, setPassword, setRole);
      reload();
    } catch (err) {
      setFormError(
        apiErrorMessage(err, addMode === "invite" ? "Could not send invite" : "Could not add team member"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function runMemberAction(
    userId: string,
    action: () => Promise<void>,
    fallback: string,
  ): Promise<void> {
    setActionUserId(userId);
    try {
      await action();
      reload();
    } catch (err) {
      alert(apiErrorMessage(err, fallback));
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRoleChange(member: TeamMember, nextRole: "admin" | "manager" | "agent") {
    if (!isAdmin || member.role === nextRole) return;
    await runMemberAction(
      member.userId,
      () => updateTeamMemberRole(member.userId, nextRole).then(() => undefined),
      "Could not update role",
    );
  }

  async function handleRemove(member: TeamMember) {
    if (!isAdmin) return;
    const label = member.user.name ?? member.user.email;
    if (!window.confirm(`Remove ${label} from your workspace?`)) return;
    await runMemberAction(
      member.userId,
      () => removeTeamMember(member.userId).then(() => undefined),
      "Could not remove team member",
    );
  }

  async function handleCancelInvite(invite: TeamInviteSummary) {
    if (!isAdmin) return;
    if (!window.confirm(`Cancel invite for ${invite.email}?`)) return;
    setActionInviteId(invite.id);
    try {
      await cancelTeamInvite(invite.id);
      reload();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not cancel invite"));
    } finally {
      setActionInviteId(null);
    }
  }

  const seatsUsed = data?.seatsUsed ?? 0;
  const seatsLimit = data?.seatsLimit ?? 0;
  const atSeatLimit = seatsLimit > 0 && seatsUsed >= seatsLimit;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Invite agents and managers by email, or add them directly with a temporary password."
      />

      <TeamSeatsSummary loading={loading} seatsUsed={seatsUsed} seatsLimit={seatsLimit} />

      <PendingInvitesList
        invites={data?.invites ?? []}
        isAdmin={isAdmin}
        busyInviteId={actionInviteId}
        onCancel={(invite) => void handleCancelInvite(invite)}
      />

      <TeamMembersList
        members={data?.items ?? []}
        loading={loading}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        busyUserId={actionUserId}
        onRoleChange={(member, nextRole) => void handleRoleChange(member, nextRole)}
        onRemove={(member) => void handleRemove(member)}
      />

      {isAdmin ? (
        <AddTeamMemberForm
          addMode={addMode}
          onModeChange={setAddMode}
          name={name}
          email={email}
          role={role}
          password={password}
          onNameChange={setName}
          onEmailChange={setEmail}
          onRoleChange={setRole}
          onPasswordChange={setPassword}
          formError={formError}
          formSuccess={formSuccess}
          submitting={submitting}
          atSeatLimit={atSeatLimit}
          onSubmit={(e) => void handleSubmit(e)}
        />
      ) : (
        <p className="text-sm text-vw-muted">Only workspace admins can invite or remove team members.</p>
      )}
    </div>
  );
}
