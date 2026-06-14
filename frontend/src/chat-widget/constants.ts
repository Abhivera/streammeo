import type { WidgetConfig } from "./types";

export const DEFAULT_ACCENT = "#FF1E2D";

export const DEFAULT_CONFIG: WidgetConfig = {
  name: "Support",
  locale: "en",
  welcomeTitle: "How can we help?",
  welcomeMessage: "Send us a message and we'll get back to you as soon as we can.",
  headerSubtitle: "We typically reply within a few minutes",
  quickPrompts: ["I need help with my order", "Billing question", "Talk to an agent"],
  accentColor: DEFAULT_ACCENT,
  panelBackground: "#ffffff",
  chatBackground: "#f4f5f7",
  textColor: "#111111",
  mutedTextColor: "#5c6370",
  position: "bottom-right",
  launcherStyle: "circle",
  requirePreChatName: false,
  requirePreChatEmail: false,
  preChatNameLabel: "Your name",
  preChatEmailLabel: "Your email",
  launcherIconUrl: null,
  avatarUrl: null,
  isOnline: true,
  offlineTitle: "We're away right now",
  offlineMessage: "Leave your details and we'll get back to you when we're online.",
  proactiveEnabled: false,
  proactiveDelaySeconds: 15,
  proactiveMessage: "Need help? Chat with us!",
  csatEnabled: true,
  csatPrompt: "How was your chat experience?",
  fileUploadEnabled: true,
};

export const CHAT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

export function accentTint(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
