import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { demoDashboardLogin } from "../auth/demo-login";
import { useAuthStore } from "../store/auth";
import type { Workspace } from "../types";

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ demoMode?: boolean }>("/health")
      .then((r) => {
        if (!cancelled) setDemoMode(Boolean(r.data.demoMode));
      })
      .catch(() => {
        if (!cancelled) setDemoMode(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post<{ token: string; workspace: Workspace }>("/auth/login", {
        email,
        password,
      });
      setToken(data.token);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials");
    }
  }

  async function tryDemoLogin(): Promise<void> {
    setError(null);
    setDemoBusy(true);
    try {
      const out = await demoDashboardLogin();
      if (out.ok) {
        setToken(out.token);
        navigate("/dashboard");
      } else {
        setError(out.message);
      }
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="vw-auth-shell flex flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <div className="mb-8 text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-vw-muted">Streammeo</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-vw-fg">Sign in</h1>
          <p className="mt-2 text-sm text-vw-muted">
            New merchant?{" "}
            <Link className="font-medium text-vw-accent hover:text-vw-accent-hover" to="/register">
              Create a workspace
            </Link>
          </p>
        </div>
        <form onSubmit={submit} className="vw-panel space-y-5 p-6 sm:p-8" noValidate>
          <label className="vw-field-label">
            Email
            <input
              className="vw-input"
              autoComplete="email"
              type="email"
              value={email}
              required
              onChange={(evt) => setEmail(evt.target.value)}
            />
          </label>
          <label className="vw-field-label">
            Password
            <input
              className="vw-input"
              type="password"
              autoComplete="current-password"
              value={password}
              required
              onChange={(evt) => setPassword(evt.target.value)}
            />
          </label>
          {error ? (
            <div className="rounded-lg border border-vw-danger-input bg-vw-bg px-3 py-2 text-sm text-vw-danger-soft" role="alert">
              {error}
            </div>
          ) : null}
          <button type="submit" className="vw-btn-primary w-full">
            Continue
          </button>
          {demoMode ? (
            <div className="rounded-lg border border-vw-border-softer bg-vw-elevated px-3 py-3 text-sm text-vw-fg-soft">
              <p className="text-vw-muted">
                Quick test: opens the seeded demo workspace (sample sessions + FAQs). Requires{" "}
                <code className="rounded bg-vw-bg px-1 py-0.5 font-mono text-xs text-vw-fg-soft">npm run db:seed</code>{" "}
                once.
              </p>
              <button
                type="button"
                disabled={demoBusy}
                onClick={() => void tryDemoLogin()}
                className="vw-btn-secondary mt-3 w-full"
              >
                {demoBusy ? "Opening…" : "Try demo dashboard"}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
