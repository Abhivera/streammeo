import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { register } from "../api/client";
import { useAuthStore } from "../store/auth";

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const data = await register({ email, password, name, workspaceName });
      setSession(data.token, data.user, data.workspace);
      navigate("/dashboard");
    } catch {
      setError("Could not register — email may already be in use");
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
            Company name
            <input
              className="vw-input"
              value={workspaceName}
              required
              minLength={2}
              onChange={(evt) => setWorkspaceName(evt.target.value)}
            />
          </label>
          <label className="vw-field-label">
            Your name
            <input
              className="vw-input"
              value={name}
              required
              onChange={(evt) => setName(evt.target.value)}
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
            Password (at least 8 characters)
            <input
              className="vw-input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
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
