import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthDivider, AuthFormCard } from "../components/AuthFormCard";
import { AuthMarketingLayout } from "../components/MarketingShell";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { PasswordInput } from "../components/PasswordInput";
import { usePageTitle } from "../hooks/usePageTitle";
import { register, loginWithGoogle } from "../api/client";
import { isFirebaseConfigured } from "../config";
import { getGoogleIdToken } from "../lib/firebase";
import { useAuthStore } from "../store/auth";

export function RegisterPage(): ReactElement {
  usePageTitle("Create workspace");
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleEnabled = isFirebaseConfigured();

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await register({ email, password, name, workspaceName });
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch {
      setError("Could not create your workspace — this email may already be registered.");
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithGoogle(): Promise<void> {
    setError(null);
    if (!workspaceName.trim()) {
      setError("Enter your company name before signing up with Google.");
      return;
    }
    try {
      const idToken = await getGoogleIdToken();
      const data = await loginWithGoogle({
        idToken,
        workspaceName: workspaceName.trim(),
        name: name.trim() || undefined,
      });
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch {
      setError("Google sign-up failed. Try again or use email and password.");
    }
  }

  return (
    <AuthMarketingLayout
      title="Create your workspace"
      description="Set up your company on Streammeo — unified ticketing, shared inboxes, and SLA tracking from day one."
      footer={
        <p className="mt-4 text-sm text-vw-muted">
          Already onboard?{" "}
          <Link
            className="font-semibold text-vw-accent underline decoration-vw-accent/40 underline-offset-4 transition-colors hover:text-vw-accent-hover hover:decoration-vw-accent"
            to="/login"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <AuthFormCard
        onSubmit={submit}
        error={error}
        submitLabel="Create workspace"
        loadingLabel="Creating workspace…"
        loading={loading}
      >
        <label className="vw-field-label" htmlFor="register-company">
          Company name
          <input
            id="register-company"
            className="vw-input"
            placeholder="Acme Inc."
            value={workspaceName}
            required
            minLength={2}
            disabled={loading}
            onChange={(evt) => setWorkspaceName(evt.target.value)}
          />
        </label>

        {googleEnabled ? (
          <>
            <GoogleSignInButton
              onClick={signUpWithGoogle}
              label="Sign up with Google"
              disabled={loading}
            />
            <AuthDivider />
          </>
        ) : null}

        <label className="vw-field-label" htmlFor="register-name">
          Your name
          <input
            id="register-name"
            className="vw-input"
            placeholder="Jane Smith"
            value={name}
            required
            disabled={loading}
            onChange={(evt) => setName(evt.target.value)}
          />
        </label>

        <label className="vw-field-label" htmlFor="register-email">
          Work email
          <input
            id="register-email"
            className="vw-input"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            value={email}
            disabled={loading}
            onChange={(evt) => setEmail(evt.target.value)}
          />
        </label>

        <label className="vw-field-label" htmlFor="register-password">
          Password
          <PasswordInput
            id="register-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            disabled={loading}
          />
        </label>
      </AuthFormCard>
    </AuthMarketingLayout>
  );
}
