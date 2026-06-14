import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthFormCard } from "../components/AuthFormCard";
import { AuthMarketingLayout } from "../components/MarketingShell";
import { usePageTitle } from "../hooks/usePageTitle";
import { requestPasswordReset } from "../api/client";

export function ForgotPasswordPage(): ReactElement {
  usePageTitle("Forgot password");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthMarketingLayout
      title="Reset your password"
      description="Enter the email on your account and we'll send a secure link to choose a new password."
    >
      <AuthFormCard
        onSubmit={submit}
        error={error}
        status={message}
        submitLabel={submitted ? "Email sent" : "Send reset link"}
        loadingLabel="Sending…"
        loading={loading}
        submitDisabled={submitted}
      >
        <label className="vw-field-label" htmlFor="forgot-email">
          Work email
          <input
            id="forgot-email"
            className="vw-input"
            autoComplete="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            required
            disabled={submitted || loading}
            onChange={(evt) => setEmail(evt.target.value)}
          />
        </label>
      </AuthFormCard>

      <p className="mt-6 text-center text-sm text-vw-muted">
        <Link
          className="font-semibold text-vw-accent underline decoration-vw-accent/40 underline-offset-4 transition-colors hover:text-vw-accent-hover hover:decoration-vw-accent"
          to="/login"
        >
          Back to sign in
        </Link>
      </p>
    </AuthMarketingLayout>
  );
}
