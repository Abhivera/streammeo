export const DOCS_LAST_UPDATED = "June 13, 2026";

export const DOCS_NAV = [
  { slug: "getting-started", label: "Getting started" },
  { slug: "agent-console", label: "Agent console" },
  { slug: "settings", label: "Workspace & settings" },
  { slug: "live-chat-widget", label: "Live chat widget" },
  { slug: "customer-experience", label: "Customer portal & CSAT (agents)" },
] as const;

export type DocSlug = (typeof DOCS_NAV)[number]["slug"];
