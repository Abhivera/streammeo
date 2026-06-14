import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthDivider, AuthFormCard } from "../components/AuthFormCard";
import { AuthMarketingLayout } from "../components/MarketingShell";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { PasswordInput } from "../components/PasswordInput";
import { usePageTitle } from "../hooks/usePageTitle";
import { login, loginWithGoogle } from "../api/client";
import { isFirebaseConfigured } from "../config";
import { getGoogleIdToken } from "../lib/firebase";
import { useAuthStore } from "../store/auth";

export function LoginPage(): ReactElement {
  usePageTitle("Sign in");
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleEnabled = isFirebaseConfigured();

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle(): Promise<void> {
    setError(null);
    try {
      const idToken = await getGoogleIdToken();
      const data = await loginWithGoogle({ idToken });
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("No account found. Create a workspace first, then sign in with Google.");
        return;
      }
      setError("Google sign-in failed. Try again or use email and password.");
    }
  }

  return (
    <AuthMarketingLayout
      title="Welcome back"
      description="Sign in to your team's support console — tickets, live chat, and SLAs in one place."
      footer={
        <p className="mt-4 text-sm text-vw-muted">
          New team?{" "}
          <Link
            className="font-semibold text-vw-accent underline decoration-vw-accent/40 underline-offset-4 transition-colors hover:text-vw-accent-hover hover:decoration-vw-accent"
            to="/register"
          >
            Create a workspace
          </Link>
        </p>
      }
    >
      <AuthFormCard
        onSubmit={submit}
        error={error}
        submitLabel="Sign in"
        loadingLabel="Signing in…"
        loading={loading}
      >
        {googleEnabled ? (
          <>
            <GoogleSignInButton onClick={signInWithGoogle} disabled={loading} />
            <AuthDivider />
          </>
        ) : null}

        <label className="vw-field-label" htmlFor="login-email">
          Work email
          <input
            id="login-email"
            className="vw-input"
            autoComplete="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            required
            disabled={loading}
            onChange={(evt) => setEmail(evt.target.value)}
          />
        </label>

        <label className="vw-field-label" htmlFor="login-password">
          <span className="flex items-center justify-between gap-2">
            <span>Password</span>
            <Link
              className="text-xs font-semibold text-vw-accent transition-colors hover:text-vw-accent-hover"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </span>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            placeholder="Your password"
          />
        </label>
      </AuthFormCard>
    </AuthMarketingLayout>
  );
}
