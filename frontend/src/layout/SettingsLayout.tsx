import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";

const SETTINGS_NAV: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/settings", label: "General", end: true },
  { to: "/settings/inboxes", label: "Shared inboxes" },
  { to: "/settings/sla", label: "SLA policies" },
  { to: "/settings/canned", label: "Canned responses" },
  { to: "/settings/kb", label: "Knowledge base" },
];

function settingsNavClass(isActive: boolean): string {
  return `rounded-lg px-3 py-2 text-sm transition-colors duration-vw ease-out-expo ${
    isActive
      ? "bg-vw-navActive font-medium text-vw-accent"
      : "text-vw-muted hover:bg-vw-elevated hover:text-vw-fg"
  }`;
}

export function SettingsLayout(): ReactElement {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <nav
        className="flex flex-wrap gap-1 border-b border-vw-border pb-4"
        aria-label="Settings sections"
      >
        {SETTINGS_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => settingsNavClass(isActive)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
