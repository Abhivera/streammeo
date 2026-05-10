import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import type { Workspace } from "../types";

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-2 text-3xl font-bold text-white">Sign in</h1>
      <p className="mb-8 text-sm text-slate-400">
        New merchant?{" "}
        <Link className="text-violet-300 hover:underline" to="/register">
          Create workspace
        </Link>
      </p>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm text-slate-300">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            autoComplete="email"
            type="email"
            value={email}
            required
            onChange={(evt) => setEmail(evt.target.value)}
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="password"
            autoComplete="current-password"
            value={password}
            required
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
