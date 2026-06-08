import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { useAuthStore } from "../store/auth";

function navClass(isActive: boolean): string {
  return `vw-nav-link ${isActive ? "vw-nav-link-active" : ""}`;
}

export function AppLayout(): ReactElement {
  const setToken = useAuthStore((s) => s.setToken);
  const workspace = useAuthStore((s) => s.workspace);

  return (
    <div className="flex min-h-screen bg-vw-bg">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-vw-border bg-vw-sidebar p-4 shadow-vw md:flex">
          <div className="mb-8 px-1">
          <BrandLogo variant="full" className="h-[11rem] w-auto max-w-full sm:h-48" />
          <div className="mt-3 text-lg font-semibold tracking-tight text-vw-headline">Agent console</div>
          <p className="mt-2 text-xs leading-snug text-vw-muted">
            {workspace?.name ?? "Customer support desk"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Primary">
          <NavLink to="/dashboard" className={({ isActive }) => navClass(isActive)}>
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={({ isActive }) => navClass(isActive)}>
            Tickets
          </NavLink>
          <NavLink to="/settings" end={false} className={({ isActive }) => navClass(isActive)}>
            Settings
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
              <span className="text-sm font-semibold tracking-tight text-vw-headline">Agent console</span>
              <span className="block text-[0.65rem] text-vw-muted">Streammeo support desk</span>
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
