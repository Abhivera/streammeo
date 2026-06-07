import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { login } from "../api/client";
import { useAuthStore } from "../store/auth";

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const data = await login(email, password);
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="vw-auth-shell flex flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <div className="mb-8 text-center">
          <BrandLogo variant="full" className="mx-auto h-56 w-auto sm:h-64" />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-vw-headline">Sign in</h1>
          <p className="mt-2 text-sm text-vw-muted">
            New team?{" "}
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
            <div
              className="rounded-lg border border-vw-danger-input bg-vw-bg px-3 py-2 text-sm text-vw-danger"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <button type="submit" className="vw-btn-primary w-full">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
