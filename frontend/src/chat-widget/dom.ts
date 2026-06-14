import { DEFAULT_CONFIG } from "./constants";
import { buildMarkup } from "./template";
import { buildStyles } from "./styles";
import type { WidgetTheme, WidgetUi } from "./types";

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`[Streammeo] Missing element: ${selector}`);
  return element;
}

export function mountWidget(initialTheme: WidgetTheme): WidgetUi {
  const host = document.createElement("div");
  host.id = "streammeo-chat-root";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const styleEl = document.createElement("style");
  styleEl.textContent = buildStyles(initialTheme);
  shadow.appendChild(styleEl);

  const template = document.createElement("template");
  template.innerHTML = buildMarkup();
  shadow.appendChild(template.content);

  const ui: WidgetUi = {
    root: host,
    styleEl,
    proactiveBubble: requireElement(shadow, ".proactive-bubble"),
    launcher: requireElement(shadow, ".launcher"),
    launcherIcon: requireElement(shadow, ".launcher-icon"),
    panel: requireElement(shadow, ".panel"),
    welcome: requireElement(shadow, ".welcome"),
    welcomeIcon: requireElement(shadow, ".welcome-icon"),
    prechat: requireElement(shadow, ".prechat"),
    prechatName: requireElement(shadow, ".prechat-name"),
    prechatEmail: requireElement(shadow, ".prechat-email"),
    prechatStartBtn: requireElement(shadow, ".prechat-start"),
    prompts: requireElement(shadow, ".prompts"),
    messages: requireElement(shadow, ".messages"),
    typing: requireElement(shadow, ".typing"),
    csat: requireElement(shadow, ".csat"),
    inputRow: requireElement(shadow, ".input-row"),
    input: requireElement(shadow, "textarea"),
    attachBtn: requireElement(shadow, ".attach-btn"),
    fileInput: requireElement(shadow, ".file-input"),
    sendBtn: requireElement(shadow, ".send-btn"),
    closeBtn: requireElement(shadow, ".close-btn"),
    headerTitle: requireElement(shadow, ".header-title"),
    headerSubtitle: requireElement(shadow, ".header-sub"),
    welcomeTitle: requireElement(shadow, ".welcome h3"),
    welcomeText: requireElement(shadow, ".welcome p"),
  };

  return ui;
}

export function applyWidgetTheme(ui: WidgetUi, theme: WidgetTheme): void {
  ui.styleEl.textContent = buildStyles(theme);
}

export function themeFromConfig(config: typeof DEFAULT_CONFIG): WidgetTheme {
  return {
    accentColor: config.accentColor,
    panelBackground: config.panelBackground,
    chatBackground: config.chatBackground,
    textColor: config.textColor,
    mutedTextColor: config.mutedTextColor,
    position: config.position,
    launcherStyle: config.launcherStyle,
  };
}

export function setIconElement(container: HTMLElement, url: string | null, fallbackSvg: string): void {
  if (url) {
    container.innerHTML = `<img src="${url}" alt="" />`;
  } else {
    container.innerHTML = fallbackSvg;
  }
}
