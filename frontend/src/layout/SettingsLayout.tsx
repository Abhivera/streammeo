import type { ReactElement } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const SETTINGS_NAV: Array<{ to: string; label: string; shortLabel?: string; end?: boolean }> = [
  { to: "/settings", label: "General", end: true },
  { to: "/settings/live-widget", label: "Live widget", shortLabel: "Widget" },
  { to: "/settings/team", label: "Team" },
  { to: "/settings/inboxes", label: "Shared inboxes", shortLabel: "Inboxes" },
  { to: "/settings/sla", label: "SLA policies", shortLabel: "SLA" },
  { to: "/settings/canned", label: "Canned responses", shortLabel: "Canned" },
  { to: "/settings/kb", label: "Knowledge base", shortLabel: "KB" },
];

const WIDE_SETTINGS_ROUTES = ["/settings/live-widget"];

function settingsNavClass(isActive: boolean): string {
  return `vw-settings-tab ${isActive ? "vw-settings-tab-active" : ""}`;
}

export function SettingsLayout(): ReactElement {
  const location = useLocation();
  const wide = WIDE_SETTINGS_ROUTES.some((route) => location.pathname.startsWith(route));

  return (
    <div className={`mx-auto min-w-0 space-y-6 sm:space-y-8 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
      <div className="vw-scroll-strip">
        <nav className="vw-settings-tabs" aria-label="Settings sections">
          {SETTINGS_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => settingsNavClass(isActive)}
            >
              <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
