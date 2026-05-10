import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const link =
  "rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white";
const active = "bg-slate-800 text-white";

export function AppLayout(): React.ReactElement {
  const setToken = useAuthStore((s) => s.setToken);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-900/80 p-4 md:flex">
        <div className="mb-6 text-lg font-semibold tracking-tight text-white">
          VoiceWidget
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/dashboard" className={({ isActive }) => `${link} ${isActive ? active : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/sessions" className={({ isActive }) => `${link} ${isActive ? active : ""}`}>
            Sessions
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `${link} ${isActive ? active : ""}`}>
            Settings
          </NavLink>
          <NavLink
            to="/settings/faq"
            className={({ isActive }) => `${link} ${isActive ? active : ""}`}
          >
            FAQ
          </NavLink>
          <NavLink
            to="/settings/billing"
            className={({ isActive }) => `${link} ${isActive ? active : ""}`}
          >
            Billing
          </NavLink>
        </nav>
        <button
          type="button"
          className="mt-8 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          onClick={() => setToken(null)}
        >
          Log out
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-3 md:hidden">
          <span className="font-semibold">VoiceWidget</span>
          <button
            type="button"
            className="text-xs text-violet-300"
            onClick={() => setToken(null)}
          >
            Log out
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
