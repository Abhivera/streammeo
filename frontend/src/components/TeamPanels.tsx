import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { PasswordInput } from "./PasswordInput";
import { formatExpiry, formatSeatLimit, roleLabel } from "../lib/teamUi";
import type { TeamInviteSummary, TeamMember } from "../types";

type MemberRole = "admin" | "manager" | "agent";
type InviteRole = "manager" | "agent";
type AddMode = "invite" | "direct";

function memberInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export function TeamAccessDenied(): ReactElement {
  return (
    <p className="vw-panel p-6 text-sm text-vw-muted">
      Only workspace admins and managers can view the team list. Ask your admin for access or a
      role change.
    </p>
  );
}

export function TeamSeatsSummary({
  loading,
  seatsUsed,
  seatsLimit,
}: {
  loading: boolean;
  seatsUsed: number;
  seatsLimit: number;
}): ReactElement {
  return (
    <section className="vw-panel space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-vw-headline">Seats</h2>
        {!loading ? (
          <span className="text-sm font-medium text-vw-fg-soft">
            {seatsUsed} / {formatSeatLimit(seatsLimit)}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm text-vw-muted">Loading…</p>
      ) : (
        <>
          <div className="vw-progress-bar">
            <div
              className="vw-progress-fill"
              style={{
                width: `${seatsLimit > 0 ? Math.min((seatsUsed / seatsLimit) * 100, 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-vw-muted">
            {seatsUsed} of {formatSeatLimit(seatsLimit)} seats used (members + pending invites)
          </p>
        </>
      )}
    </section>
  );
}

export function PendingInvitesList({
  invites,
  isAdmin,
  busyInviteId,
  onCancel,
}: {
  invites: TeamInviteSummary[];
  isAdmin: boolean;
  busyInviteId: string | null;
  onCancel: (invite: TeamInviteSummary) => void;
}): ReactElement | null {
  if (invites.length === 0) return null;

  return (
    <section className="vw-panel divide-y divide-vw-border-faint">
      <div className="border-b border-vw-border px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-vw-muted">
          Pending invites
        </h2>
      </div>
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex items-center gap-3">
            <div className="vw-avatar h-10 w-10">{memberInitials(invite.name, invite.email)}</div>
            <div className="min-w-0">
              <p className="font-medium text-vw-headline">{invite.name}</p>
              <p className="text-sm text-vw-muted">{invite.email}</p>
              <p className="mt-1 text-xs text-vw-warning">
                {roleLabel(invite.role)} · expires {formatExpiry(invite.expiresAt)}
              </p>
            </div>
          </div>
          {isAdmin ? (
            <button
              type="button"
              className="vw-btn-secondary text-sm"
              disabled={busyInviteId === invite.id}
              onClick={() => onCancel(invite)}
            >
              Cancel invite
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export function TeamMembersList({
  members,
  loading,
  isAdmin,
  currentUserId,
  busyUserId,
  onRoleChange,
  onRemove,
}: {
  members: TeamMember[];
  loading: boolean;
  isAdmin: boolean;
  currentUserId?: string;
  busyUserId: string | null;
  onRoleChange: (member: TeamMember, role: MemberRole) => void;
  onRemove: (member: TeamMember) => void;
}): ReactElement {
  return (
    <section className="vw-panel divide-y divide-vw-border-faint">
      <div className="border-b border-vw-border px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-vw-muted">Members</h2>
      </div>
      {loading ? (
        <p className="p-6 text-sm text-vw-muted">Loading team…</p>
      ) : members.length === 0 ? (
        <p className="p-6 text-sm text-vw-muted">No team members yet.</p>
      ) : (
        members.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <div
              key={member.userId}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="vw-avatar h-10 w-10">
                  {memberInitials(member.user.name, member.user.email)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-vw-headline">
                    {member.user.name ?? member.user.email}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-vw-muted">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-vw-muted">{member.user.email}</p>
                </div>
              </div>
              <div className="vw-list-row-actions">
                {isAdmin ? (
                  <select
                    className="vw-input !mt-0 w-full py-1.5 text-sm sm:w-auto sm:min-w-[7rem]"
                    value={member.role}
                    disabled={busyUserId === member.userId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      onRoleChange(member, e.target.value as MemberRole)
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="agent">Agent</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-vw-elevated px-3 py-1 text-xs font-medium capitalize text-vw-fg">
                    {roleLabel(member.role)}
                  </span>
                )}
                {isAdmin && !isSelf ? (
                  <button
                    type="button"
                    className="vw-btn-secondary text-sm"
                    disabled={busyUserId === member.userId}
                    onClick={() => onRemove(member)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

const MODE_BUTTON_CLASS = "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";

function modeButtonClass(active: boolean): string {
  return active
    ? `${MODE_BUTTON_CLASS} bg-vw-navActive text-vw-accent`
    : `${MODE_BUTTON_CLASS} text-vw-muted hover:bg-vw-elevated hover:text-vw-fg`;
}

export function AddTeamMemberForm({
  addMode,
  onModeChange,
  name,
  email,
  role,
  password,
  onNameChange,
  onEmailChange,
  onRoleChange,
  onPasswordChange,
  formError,
  formSuccess,
  submitting,
  atSeatLimit,
  onSubmit,
}: {
  addMode: AddMode;
  onModeChange: (mode: AddMode) => void;
  name: string;
  email: string;
  role: InviteRole;
  password: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: InviteRole) => void;
  onPasswordChange: (value: string) => void;
  formError: string | null;
  formSuccess: string | null;
  submitting: boolean;
  atSeatLimit: boolean;
  onSubmit: (e: FormEvent) => void;
}): ReactElement {
  const submitLabel = submitting
    ? addMode === "invite"
      ? "Sending…"
      : "Adding…"
    : atSeatLimit
      ? "Seat limit reached"
      : addMode === "invite"
        ? "Send invite"
        : "Add to team";

  return (
    <form onSubmit={onSubmit} className="vw-panel space-y-4 p-6">
      <div className="flex flex-wrap gap-1 rounded-lg border border-vw-border bg-vw-elevated/50 p-1">
        <button type="button" className={modeButtonClass(addMode === "invite")} onClick={() => onModeChange("invite")}>
          Send invite
        </button>
        <button type="button" className={modeButtonClass(addMode === "direct")} onClick={() => onModeChange("direct")}>
          Add directly
        </button>
      </div>

      <h2 className="text-lg font-medium text-vw-headline">
        {addMode === "invite" ? "Invite by email" : "Add with password"}
      </h2>
      <p className="text-sm text-vw-muted">
        {addMode === "invite"
          ? "They receive a link to accept and set their password. Expires in 7 days."
          : "You set a temporary password and share it with them manually."}
      </p>

      {formError ? (
        <p className="rounded-lg border border-vw-danger-edge bg-vw-danger-soft px-4 py-3 text-sm text-vw-danger">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p className="rounded-lg border border-vw-success-edge bg-vw-success-soft px-4 py-3 text-sm text-vw-success break-all">
          {formSuccess}
        </p>
      ) : null}

      <label className="vw-field-label">
        Name
        <input
          className="vw-input"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
          placeholder="Jane Smith"
          required
          disabled={submitting || atSeatLimit}
        />
      </label>

      <label className="vw-field-label">
        Work email
        <input
          className="vw-input"
          type="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onEmailChange(e.target.value)}
          placeholder="agent@company.com"
          required
          disabled={submitting || atSeatLimit}
        />
      </label>

      <label className="vw-field-label">
        Role
        <select
          className="vw-input"
          value={role}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onRoleChange(e.target.value as InviteRole)
          }
          disabled={submitting || atSeatLimit}
        >
          <option value="agent">Agent — tickets & live chat</option>
          <option value="manager">Manager — agents + workspace settings</option>
        </select>
      </label>

      {addMode === "direct" ? (
        <label className="vw-field-label">
          Temporary password
          <PasswordInput
            value={password}
            onChange={onPasswordChange}
            placeholder="At least 8 characters (new users only)"
            minLength={8}
            disabled={submitting || atSeatLimit}
          />
        </label>
      ) : null}

      <button type="submit" className="vw-btn-primary" disabled={submitting || atSeatLimit}>
        {submitLabel}
      </button>
    </form>
  );
}
