export const HELP_LAST_UPDATED = "June 13, 2026";

export const HELP_NAV = [
  { slug: "getting-help", label: "How to get help" },
  { slug: "live-chat", label: "Using live chat" },
  { slug: "track-your-request", label: "Track your request" },
  { slug: "rate-your-experience", label: "Rate your experience" },
  { slug: "faq", label: "FAQ" },
] as const;

export type HelpSlug = (typeof HELP_NAV)[number]["slug"];
