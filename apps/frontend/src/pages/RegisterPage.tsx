import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import type { Workspace } from "../types";

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-2 text-3xl font-bold text-white">Create workspace</h1>
      <p className="mb-8 text-sm text-slate-400">
        Already onboard?{" "}
        <Link className="text-violet-300 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm text-slate-300">
          Store / brand name
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={workspaceName}
            required
            minLength={2}
            onChange={(evt) => setWorkspaceName(evt.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(evt) => setEmail(evt.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password (min 10 characters)
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
          />
        </label>
        {error ? <div className="text-sm text-rose-400">{error}</div> : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-violet-600 px-3 py-2 font-medium text-white hover:bg-violet-500"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
