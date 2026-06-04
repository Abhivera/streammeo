import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { useAuthStore } from "../store/auth";

function navClass(isActive: boolean): string {
  return `vw-nav-link ${isActive ? "vw-nav-link-active" : ""}`;
}

export function AppLayout(): ReactElement {
  const setToken = useAuthStore((s) => s.setToken);

  return (
    <div className="flex min-h-screen bg-vw-bg">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-vw-border bg-vw-sidebar p-4 shadow-vw md:flex">
        <div className="mb-8 px-1">
          <BrandLogo variant="full" className="h-[11rem] w-auto max-w-full sm:h-48" />
          <div className="mt-3 text-lg font-semibold tracking-tight text-vw-headline">Console</div>
          <p className="mt-2 text-xs leading-snug text-vw-muted">Voice customer support</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Primary">
          <NavLink to="/dashboard" className={({ isActive }) => navClass(isActive)}>
            Dashboard
          </NavLink>
          <NavLink to="/sessions" className={({ isActive }) => navClass(isActive)}>
            Sessions
          </NavLink>
          <NavLink to="/playground" className={({ isActive }) => navClass(isActive)}>
            Playground
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => navClass(isActive)}>
            Settings
          </NavLink>
          <NavLink to="/settings/faq" className={({ isActive }) => navClass(isActive)}>
            FAQ
          </NavLink>
        </nav>
        <button
          type="button"
          className="vw-btn-secondary mt-6 w-full text-left"
          onClick={() => setToken(null)}
        >
          Log out
        </button>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-vw-bg">
        <header className="flex items-center justify-between border-b border-vw-border bg-vw-surface px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo variant="icon" />
            <div className="min-w-0">
              <span className="text-sm font-semibold tracking-tight text-vw-headline">Console</span>
              <span className="block text-[0.65rem] text-vw-muted">Voice support</span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-vw-accent transition-colors duration-vw ease-out-expo hover:bg-vw-elevated hover:text-vw-accent-hover"
            onClick={() => setToken(null)}
          >
            Log out
          </button>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
