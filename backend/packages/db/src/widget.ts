export type WidgetPosition = "bottom-right" | "bottom-left";
export type WidgetLauncherStyle = "circle" | "rounded";

export type WidgetLocaleStrings = {
  welcomeTitle?: string;
  welcomeMessage?: string;
  headerSubtitle?: string;
  quickPrompts?: string[];
  offlineTitle?: string;
  offlineMessage?: string;
  preChatNameLabel?: string;
  preChatEmailLabel?: string;
  proactiveMessage?: string;
  csatPrompt?: string;
};

export type WidgetSettings = {
  displayName: string | null;
  welcomeTitle: string;
  welcomeMessage: string;
  headerSubtitle: string;
  quickPrompts: string[];
  accentColor: string;
  panelBackground: string;
  chatBackground: string;
  textColor: string;
  mutedTextColor: string;
  position: WidgetPosition;
  launcherStyle: WidgetLauncherStyle;
  requirePreChatName: boolean;
  requirePreChatEmail: boolean;
  preChatNameLabel: string;
  preChatEmailLabel: string;
  launcherIconUrl: string | null;
  avatarUrl: string | null;
  businessHoursEnabled: boolean;
  businessHoursStart: number | null;
  businessHoursEnd: number | null;
  businessHoursTimezone: string;
  offlineTitle: string;
  offlineMessage: string;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  csatEnabled: boolean;
  csatPrompt: string;
  fileUploadEnabled: boolean;
  defaultLocale: string;
  locales: Record<string, WidgetLocaleStrings>;
  widgets: Record<string, Partial<WidgetSettings>>;
};

export const DEFAULT_WIDGET_ACCENT = "#FF1E2D";

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  displayName: null,
  welcomeTitle: "How can we help?",
  welcomeMessage: "Send us a message and we'll get back to you as soon as we can.",
  headerSubtitle: "We typically reply within a few minutes",
  quickPrompts: ["I need help with my order", "Billing question", "Talk to an agent"],
  accentColor: DEFAULT_WIDGET_ACCENT,
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
  businessHoursEnabled: false,
  businessHoursStart: 9,
  businessHoursEnd: 17,
  businessHoursTimezone: "local",
  offlineTitle: "We're away right now",
  offlineMessage: "Leave your details and we'll get back to you when we're online.",
  proactiveEnabled: false,
  proactiveDelaySeconds: 15,
  proactiveMessage: "Need help? Chat with us!",
  csatEnabled: true,
  csatPrompt: "How was your chat experience?",
  fileUploadEnabled: true,
  defaultLocale: "en",
  locales: {},
  widgets: {},
};

const LOCALE_KEYS: (keyof WidgetLocaleStrings)[] = [
  "welcomeTitle",
  "welcomeMessage",
  "headerSubtitle",
  "quickPrompts",
  "offlineTitle",
  "offlineMessage",
  "preChatNameLabel",
  "preChatEmailLabel",
  "proactiveMessage",
  "csatPrompt",
];

export function mergeWidgetSettings(
  patch?: Partial<WidgetSettings> | null,
): WidgetSettings {
  if (!patch) return { ...DEFAULT_WIDGET_SETTINGS };
  return {
    ...DEFAULT_WIDGET_SETTINGS,
    ...patch,
    quickPrompts:
      patch.quickPrompts && patch.quickPrompts.length > 0
        ? patch.quickPrompts
        : DEFAULT_WIDGET_SETTINGS.quickPrompts,
    locales: { ...DEFAULT_WIDGET_SETTINGS.locales, ...patch.locales },
    widgets: { ...DEFAULT_WIDGET_SETTINGS.widgets, ...patch.widgets },
  };
}

function applyLocaleStrings(settings: WidgetSettings, locale?: string): WidgetSettings {
  if (!locale) return settings;
  const strings = settings.locales[locale];
  if (!strings) return settings;
  const next = { ...settings };
  for (const key of LOCALE_KEYS) {
    const value = strings[key];
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

export function isWithinBusinessHours(settings: WidgetSettings, now = new Date()): boolean {
  if (!settings.businessHoursEnabled) return true;
  const start = settings.businessHoursStart;
  const end = settings.businessHoursEnd;
  if (start == null || end == null) return true;

  let hour: number;
  if (settings.businessHoursTimezone === "local") {
    hour = now.getHours();
  } else {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: settings.businessHoursTimezone,
        hour: "numeric",
        hour12: false,
      }).formatToParts(now);
      hour = Number(parts.find((p) => p.type === "hour")?.value ?? now.getHours());
    } catch {
      hour = now.getHours();
    }
  }

  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function resolveWidgetConfig(
  workspace: {
    name: string;
    widgetSettings?: Partial<WidgetSettings> | null;
  },
  options?: { widgetId?: string; locale?: string },
) {
  let settings = mergeWidgetSettings(workspace.widgetSettings);

  const widgetId = options?.widgetId?.trim();
  if (widgetId && settings.widgets[widgetId]) {
    settings = mergeWidgetSettings({ ...settings, ...settings.widgets[widgetId] });
  }

  const locale = options?.locale?.trim() || settings.defaultLocale;
  settings = applyLocaleStrings(settings, locale);

  const online = isWithinBusinessHours(settings);

  return {
    name: settings.displayName?.trim() || workspace.name,
    locale,
    welcomeTitle: online ? settings.welcomeTitle : settings.offlineTitle,
    welcomeMessage: online ? settings.welcomeMessage : settings.offlineMessage,
    headerSubtitle: settings.headerSubtitle,
    quickPrompts: settings.quickPrompts,
    accentColor: settings.accentColor,
    panelBackground: settings.panelBackground,
    chatBackground: settings.chatBackground,
    textColor: settings.textColor,
    mutedTextColor: settings.mutedTextColor,
    position: settings.position,
    launcherStyle: settings.launcherStyle,
    requirePreChatName: settings.requirePreChatName,
    requirePreChatEmail: settings.requirePreChatEmail,
    preChatNameLabel: settings.preChatNameLabel,
    preChatEmailLabel: settings.preChatEmailLabel,
    launcherIconUrl: settings.launcherIconUrl,
    avatarUrl: settings.avatarUrl,
    isOnline: online,
    offlineTitle: settings.offlineTitle,
    offlineMessage: settings.offlineMessage,
    proactiveEnabled: settings.proactiveEnabled,
    proactiveDelaySeconds: settings.proactiveDelaySeconds,
    proactiveMessage: settings.proactiveMessage,
    csatEnabled: settings.csatEnabled,
    csatPrompt: settings.csatPrompt,
    fileUploadEnabled: settings.fileUploadEnabled,
  };
}
