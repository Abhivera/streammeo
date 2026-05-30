import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { api, getApiErrorMessage } from "../api/client";
import { signInWithGoogleAndCreateSession } from "../auth/firebase-google";
import { isFirebaseClientConfigured } from "../firebase/client";
import { useAuthStore } from "../store/auth";
import type { Workspace } from "../types";

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ firebaseAuth?: boolean }>("/health")
      .then((r) => {
        if (!cancelled) {
          setFirebaseReady(Boolean(r.data.firebaseAuth) && isFirebaseClientConfigured());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFirebaseReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post<{ token: string; workspace: Workspace }>("/auth/register", {
        email,
        password,
        workspaceName,
      });
      setToken(data.token);
      navigate("/dashboard");
    } catch {
      setError("Could not register");
    }
  }

  async function googleSignUp(): Promise<void> {
    const name = workspaceName.trim();
    if (name.length < 2) {
      setError("Enter your store or brand name before signing up with Google.");
      return;
    }
    setError(null);
    setGoogleBusy(true);
    try {
      const { token } = await signInWithGoogleAndCreateSession({ workspaceName: name });
      setToken(token);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Google sign-up failed"));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <div className="vw-auth-shell flex flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <div className="mb-8 text-center">
          <BrandLogo variant="full" className="mx-auto h-56 w-auto sm:h-64" />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-vw-headline">Create workspace</h1>
          <p className="mt-2 text-sm text-vw-muted">
            Already onboard?{" "}
            <Link className="font-medium text-vw-accent hover:text-vw-accent-hover" to="/login">
              Sign in
            </Link>
          </p>
        </div>
        <form onSubmit={submit} className="vw-panel space-y-5 p-6 sm:p-8" noValidate>
          <label className="vw-field-label">
            Store or brand name
            <input
              className="vw-input"
              value={workspaceName}
              required
              minLength={2}
              onChange={(evt) => setWorkspaceName(evt.target.value)}
            />
          </label>
          <label className="vw-field-label">
            Email
            <input
              className="vw-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(evt) => setEmail(evt.target.value)}
            />
          </label>
          <label className="vw-field-label">
            Password (at least 10 characters)
            <input
              className="vw-input"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={password}
              onChange={(evt) => setPassword(evt.target.value)}
            />
          </label>
          {error ? (
            <div className="rounded-lg border border-vw-danger-input bg-vw-bg px-3 py-2 text-sm text-vw-danger" role="alert">
              {error}
            </div>
          ) : null}
          <button type="submit" className="vw-btn-primary w-full">
            Continue
          </button>
          <p className="text-center text-xs leading-relaxed text-vw-muted">
            By creating an account, you agree to our{" "}
            <Link className="font-medium text-vw-accent hover:text-vw-accent-hover" to="/legal/terms">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link className="font-medium text-vw-accent hover:text-vw-accent-hover" to="/legal/privacy">
              Privacy Policy
            </Link>
            .
          </p>
          {firebaseReady ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-vw-border-softer" />
                </div>
                <div className="relative flex justify-center text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
                  <span className="bg-vw-elevated px-2">Or</span>
                </div>
              </div>
              <button
                type="button"
                disabled={googleBusy}
                onClick={() => void googleSignUp()}
                className="vw-btn-secondary flex w-full items-center justify-center gap-2"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleBusy ? "Signing up…" : "Sign up with Google"}
              </button>
            </>
          ) : null}
        </form>
      </div>
    </div>
  );
}
