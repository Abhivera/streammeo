export type ChatRole = "visitor" | "bot" | "agent";

export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size: number;
};

export type KbArticle = {
  title: string;
  excerpt: string;
};

export type ChatMessage = {
  role: string;
  body: string;
  createdAt?: string;
  agentName?: string | null;
  attachments?: ChatAttachment[];
};

export type WidgetPosition = "bottom-right" | "bottom-left";
export type WidgetLauncherStyle = "circle" | "rounded";

export type WidgetTheme = {
  accentColor: string;
  panelBackground: string;
  chatBackground: string;
  textColor: string;
  mutedTextColor: string;
  position: WidgetPosition;
  launcherStyle: WidgetLauncherStyle;
};

export type WidgetConfig = WidgetTheme & {
  name: string;
  locale: string;
  welcomeTitle: string;
  welcomeMessage: string;
  headerSubtitle: string;
  quickPrompts: string[];
  requirePreChatName: boolean;
  requirePreChatEmail: boolean;
  preChatNameLabel: string;
  preChatEmailLabel: string;
  launcherIconUrl: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  offlineTitle: string;
  offlineMessage: string;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  csatEnabled: boolean;
  csatPrompt: string;
  fileUploadEnabled: boolean;
};

export type WidgetUi = {
  root: HTMLDivElement;
  styleEl: HTMLStyleElement;
  launcher: HTMLButtonElement;
  launcherIcon: HTMLSpanElement;
  proactiveBubble: HTMLDivElement;
  panel: HTMLDivElement;
  welcome: HTMLDivElement;
  welcomeIcon: HTMLSpanElement;
  prechat: HTMLDivElement;
  prechatName: HTMLInputElement;
  prechatEmail: HTMLInputElement;
  prechatStartBtn: HTMLButtonElement;
  prompts: HTMLDivElement;
  messages: HTMLDivElement;
  typing: HTMLDivElement;
  csat: HTMLDivElement;
  inputRow: HTMLDivElement;
  input: HTMLTextAreaElement;
  attachBtn: HTMLButtonElement;
  fileInput: HTMLInputElement;
  sendBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
  headerTitle: HTMLDivElement;
  headerSubtitle: HTMLDivElement;
  welcomeTitle: HTMLHeadingElement;
  welcomeText: HTMLParagraphElement;
};

export type WidgetOptions = {
  apiKey: string;
  apiBase: string;
  embedAccent?: string | null;
  locale?: string | null;
  widgetId?: string | null;
};

export type PendingAttachment = {
  name: string;
  mimeType: string;
  url: string;
  size: number;
};

export type PresignUploadResponse = {
  uploadUrl: string;
  url: string;
  key: string;
};
