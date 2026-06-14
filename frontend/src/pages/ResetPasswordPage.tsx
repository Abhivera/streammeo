import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthFormCard } from "../components/AuthFormCard";
import { AuthMarketingLayout } from "../components/MarketingShell";
import { PasswordInput } from "../components/PasswordInput";
import { usePageTitle } from "../hooks/usePageTitle";
import { resetPassword } from "../api/client";

export function ResetPasswordPage(): ReactElement {
  usePageTitle("Reset password");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Invalid reset link. Request a new one from the sign-in page.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("Invalid or expired reset link. Request a new one.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthMarketingLayout
      title="Choose a new password"
      description="Enter and confirm your new password below."
    >
      <AuthFormCard
        onSubmit={submit}
        error={error}
        status={message}
        submitLabel="Update password"
        loadingLabel="Updating…"
        loading={loading}
      >
        <label className="vw-field-label" htmlFor="reset-password">
          New password
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            disabled={loading}
          />
        </label>

        <label className="vw-field-label" htmlFor="reset-confirm">
          Confirm password
          <PasswordInput
            id="reset-confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            minLength={8}
            required
            disabled={loading}
          />
        </label>
      </AuthFormCard>

      <p className="mt-6 text-center text-sm text-vw-muted">
        <Link
          className="font-semibold text-vw-accent underline decoration-vw-accent/40 underline-offset-4 transition-colors hover:text-vw-accent-hover hover:decoration-vw-accent"
          to="/forgot-password"
        >
          Request a new link
        </Link>
      </p>
    </AuthMarketingLayout>
  );
}
