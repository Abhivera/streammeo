import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthFormCard } from "../components/AuthFormCard";
import { AuthMarketingLayout } from "../components/MarketingShell";
import { PasswordInput } from "../components/PasswordInput";
import { usePageTitle } from "../hooks/usePageTitle";
import { acceptTeamInvite, fetchTeamInvitePreview } from "../api/client";
import { apiErrorMessage } from "../lib/apiError";
import { roleLabel } from "../lib/teamUi";
import { useAuthStore } from "../store/auth";
import type { TeamInvitePreview } from "../types";

export function AcceptInvitePage(): ReactElement {
  usePageTitle("Accept invite");
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<TeamInvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid invite link.");
      return;
    }
    fetchTeamInvitePreview(token)
      .then(setPreview)
      .catch(() => setLoadError("This invite is invalid or has expired."));
  }, [token]);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid invite link.");
      return;
    }

    if (preview?.needsPassword && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await acceptTeamInvite({
        token,
        password: preview?.needsPassword ? password : undefined,
      });
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not accept invite. The link may have expired or seats may be full."));
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <AuthMarketingLayout title="Invite unavailable" description={loadError}>
        <p className="text-center text-sm text-vw-muted">
          <Link className="font-semibold text-vw-accent hover:text-vw-accent-hover" to="/login">
            Sign in
          </Link>{" "}
          if you already joined, or ask your admin to send a new invite.
        </p>
      </AuthMarketingLayout>
    );
  }

  if (!preview) {
    return (
      <AuthMarketingLayout title="Join your team" description="Loading invite…">
        <p className="text-center text-sm text-vw-muted">Please wait…</p>
      </AuthMarketingLayout>
    );
  }

  return (
    <AuthMarketingLayout
      title={`Join ${preview.workspaceName}`}
      description={`You've been invited as a ${roleLabel(preview.role)}. Accept below to access the support console.`}
    >
      <AuthFormCard
        onSubmit={submit}
        error={error}
        submitLabel="Accept invite & join"
        loadingLabel="Joining…"
        loading={loading}
      >
        <div className="rounded-lg border border-vw-border bg-vw-elevated/60 px-4 py-3 text-sm">
          <p className="text-vw-fg">
            <span className="text-vw-muted">Email:</span> {preview.email}
          </p>
          <p className="mt-1 text-vw-fg">
            <span className="text-vw-muted">Role:</span> {roleLabel(preview.role)}
          </p>
        </div>

        {preview.needsPassword ? (
          <>
            <label className="vw-field-label" htmlFor="invite-password">
              {preview.hasAccount ? "Set a password" : "Create a password"}
              <PasswordInput
                id="invite-password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                minLength={8}
                required
                disabled={loading}
              />
            </label>

            <label className="vw-field-label" htmlFor="invite-confirm">
              Confirm password
              <PasswordInput
                id="invite-confirm"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                minLength={8}
                required
                disabled={loading}
              />
            </label>
          </>
        ) : (
          <p className="text-sm text-vw-muted">
            Your existing account will be added to this workspace. Click below to continue.
          </p>
        )}
      </AuthFormCard>

      <p className="mt-6 text-center text-sm text-vw-muted">
        Already signed in elsewhere?{" "}
        <Link
          className="font-semibold text-vw-accent underline decoration-vw-accent/40 underline-offset-4 transition-colors hover:text-vw-accent-hover"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthMarketingLayout>
  );
}
