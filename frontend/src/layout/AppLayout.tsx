import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import {
  ChatIcon,
  DashboardIcon,
  LogOutIcon,
  SettingsIcon,
  TicketsIcon,
} from "../components/NavIcons";
import { useAuthStore } from "../store/auth";

function navClass(isActive: boolean): string {
  return `vw-nav-link flex items-center gap-2.5 ${isActive ? "vw-nav-link-active" : ""}`;
}

function mobileNavClass(isActive: boolean): string {
  return `vw-mobile-nav-link ${isActive ? "vw-mobile-nav-link-active" : ""}`;
}

function userInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "AG";
}

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: DashboardIcon },
  { to: "/tickets", label: "Tickets", shortLabel: "Tickets", icon: TicketsIcon },
  { to: "/live-chat", label: "Live chat", shortLabel: "Chat", icon: ChatIcon },
  { to: "/settings", label: "Settings", shortLabel: "Settings", icon: SettingsIcon, end: false },
] as const;

export function AppLayout(): ReactElement {
  const setToken = useAuthStore((s) => s.setToken);
  const workspace = useAuthStore((s) => s.workspace);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen overflow-x-hidden bg-vw-bg">
      <div className="flex min-h-screen min-w-0">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-vw-border bg-vw-sidebar p-4 shadow-vw md:flex">
          <div className="mb-8 px-1">
            <BrandLogo variant="full" fit="chrome" chromeSize="nav" />
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-vw-accent/20 bg-vw-accent-surface px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-vw-accent">
              Agent console
            </div>
            <p className="mt-3 text-xs leading-snug text-vw-muted">
              {workspace?.name ?? "Customer support desk"}
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5" aria-label="Primary">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : true}
                className={({ isActive }) => navClass(isActive)}
              >
                <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 space-y-3 border-t border-vw-border pt-4">
            <div className="flex items-center gap-3 rounded-xl border border-vw-border bg-vw-surface/60 px-3 py-2.5">
              <div className="vw-avatar h-9 w-9">{userInitials(user?.name, user?.email)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-vw-fg">{user?.name ?? "Agent"}</p>
                <p className="truncate text-xs text-vw-muted">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="vw-btn-secondary flex w-full items-center justify-center gap-2"
              onClick={() => setToken(null)}
            >
              <LogOutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden bg-vw-bg">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-vw-border bg-vw-surface px-4 py-3 md:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <BrandLogo variant="icon" fit="chrome" />
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight text-vw-headline">
                  {workspace?.name ?? "Agent console"}
                </span>
                <span className="block truncate text-[0.65rem] text-vw-muted">{user?.email}</span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-vw-accent transition-colors duration-vw ease-out-expo hover:bg-vw-elevated hover:text-vw-accent-hover"
              onClick={() => setToken(null)}
            >
              Log out
            </button>
          </header>

          <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 overflow-x-hidden px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 md:py-8 md:pb-8 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="vw-mobile-nav" aria-label="Mobile navigation">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : true}
            className={({ isActive }) => mobileNavClass(isActive)}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="max-w-[4.5rem] truncate">{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

