import { createChatApi } from "./api";
import { CHAT_ICON_SVG, DEFAULT_ACCENT, DEFAULT_CONFIG } from "./constants";
import { applyWidgetTheme, mountWidget, setIconElement, themeFromConfig } from "./dom";
import { createMessageRenderer } from "./messages";
import { createChatSocket } from "./socket";
import { createSessionStore } from "./storage";
import type { PendingAttachment, WidgetConfig, WidgetOptions, WidgetUi } from "./types";

type VisitorInfo = { name?: string; email?: string };

export class ChatWidget {
  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly embedAccent: string | null;
  private readonly locale: string | null;
  private readonly widgetId: string | null;
  private readonly api: ReturnType<typeof createChatApi>;
  private readonly sessionStore: ReturnType<typeof createSessionStore>;
  private readonly ui: WidgetUi;
  private readonly messages: ReturnType<typeof createMessageRenderer>;

  private sessionId: string | null = null;
  private visitorId: string | null = null;
  private panelOpen = false;
  private sending = false;
  private config: WidgetConfig = { ...DEFAULT_CONFIG };
  private socket: { disconnect: () => void; emitTyping: (typing: boolean) => void } | null = null;
  private seenMessageKeys = new Set<string>();
  private visitorInfo: VisitorInfo = {};
  private preChatComplete = false;
  private pendingAttachments: PendingAttachment[] = [];
  private proactiveTimer: ReturnType<typeof setTimeout> | null = null;
  private proactiveShown = false;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private csatRating = 0;
  private chatEnded = false;

  constructor(options: WidgetOptions) {
    this.apiKey = options.apiKey;
    this.apiBase = options.apiBase;
    this.embedAccent = options.embedAccent ?? null;
    this.locale = options.locale ?? null;
    this.widgetId = options.widgetId ?? null;
    const initialAccent = this.embedAccent ?? DEFAULT_ACCENT;
    this.api = createChatApi(this.apiKey, this.apiBase, {
      locale: this.locale,
      widgetId: this.widgetId,
    });
    this.sessionStore = createSessionStore(`streammeo_chat_${this.apiKey.slice(0, 12)}`);
    this.ui = mountWidget({
      ...themeFromConfig(DEFAULT_CONFIG),
      accentColor: initialAccent,
    });
    this.messages = createMessageRenderer(this.ui, () => this.config.name);
    this.ui.inputRow.classList.add("hidden");
  }

  init(): void {
    this.bindEvents();
    void this.loadConfig();
  }

  private bindEvents(): void {
    this.ui.launcher.addEventListener("click", () => void this.togglePanel());
    this.ui.closeBtn.addEventListener("click", () => this.setPanelOpen(false));
    this.ui.sendBtn.addEventListener("click", () => void this.sendMessage());
    this.ui.input.addEventListener("input", () => {
      this.resizeInput();
      this.handleVisitorTyping();
    });
    this.ui.input.addEventListener("keydown", (event) => this.handleKeydown(event));
    this.ui.prechatStartBtn.addEventListener("click", () => this.completePreChat());
    this.ui.prechatName.addEventListener("input", () => this.updatePreChatState());
    this.ui.prechatEmail.addEventListener("input", () => this.updatePreChatState());
    this.ui.attachBtn.addEventListener("click", () => this.ui.fileInput.click());
    this.ui.fileInput.addEventListener("change", () => void this.handleFileSelect());

    const proactiveDismiss = this.ui.proactiveBubble.querySelector(".proactive-dismiss");
    const proactiveText = this.ui.proactiveBubble.querySelector(".proactive-text");
    proactiveDismiss?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideProactive();
    });
    proactiveText?.addEventListener("click", () => void this.togglePanel());

    const submitBtn = this.ui.csat.querySelector<HTMLButtonElement>(".csat-submit");
    submitBtn?.addEventListener("click", () => void this.submitCsat());
  }

  private messageKey(role: string, body: string, createdAt?: string): string {
    return `${role}:${createdAt ?? ""}:${body}`;
  }

  private trackMessage(role: string, body: string, createdAt?: string): boolean {
    const key = this.messageKey(role, body, createdAt);
    if (this.seenMessageKeys.has(key)) return false;
    this.seenMessageKeys.add(key);
    return true;
  }

  private connectSocket(): void {
    this.socket?.disconnect();
    this.socket = null;
    if (!this.sessionId || !this.visitorId) return;

    const connected = createChatSocket(this.apiBase, this.sessionId, this.visitorId, {
      onMessage: (message) => {
        const role = message.role === "visitor" ? "visitor" : message.role === "agent" ? "agent" : "bot";
        if (!this.trackMessage(role, message.body, message.createdAt)) return;
        const authorLabel =
          role === "agent" ? (message.agentName ?? this.config.name) : undefined;
        this.messages.setTyping(false);
        this.messages.appendMsg(
          role,
          message.body,
          message.createdAt,
          undefined,
          authorLabel,
          message.attachments,
        );
      },
      onTyping: (payload) => {
        if (payload.role === "agent" && payload.typing) {
          const label = payload.agentName ? `${payload.agentName} is typing` : "Agent is typing";
          this.messages.setTyping(true, label);
        } else if (payload.role === "agent") {
          this.messages.setTyping(false);
        }
      },
      onSessionClosed: (payload) => {
        this.chatEnded = true;
        this.ui.inputRow.classList.add("hidden");
        this.socket?.disconnect();
        this.socket = null;
        if (payload.csatEnabled) this.showCsat(payload.csatPrompt);
      },
    });
    this.socket = connected;
  }

  private handleVisitorTyping(): void {
    if (!this.socket || !this.sessionId) return;
    this.socket.emitTyping(true);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.socket?.emitTyping(false), 1200);
  }

  private persistSession(): void {
    if (this.sessionId && this.visitorId) {
      this.sessionStore.save({
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        visitorName: this.visitorInfo.name,
        visitorEmail: this.visitorInfo.email,
      });
    } else {
      this.sessionStore.save(null);
    }
  }

  private async togglePanel(): Promise<void> {
    this.hideProactive();
    const nextOpen = !this.panelOpen;
    this.setPanelOpen(nextOpen);
    if (!nextOpen) return;

    if (this.sessionId && this.visitorId) {
      this.connectSocket();
      return;
    }

    const saved = this.sessionStore.load();
    if (!saved) return;

    try {
      if (saved.visitorName) this.visitorInfo.name = saved.visitorName;
      if (saved.visitorEmail) this.visitorInfo.email = saved.visitorEmail;
      if (saved.visitorName || saved.visitorEmail) this.preChatComplete = true;
      await this.restoreSession(saved.sessionId, saved.visitorId);
    } catch {
      this.sessionStore.save(null);
      this.sessionId = null;
      this.visitorId = null;
    }
  }

  private setPanelOpen(open: boolean): void {
    this.panelOpen = open;
    this.ui.panel.classList.toggle("open", open);
    this.ui.launcher.classList.toggle("open", open);
    if (open) {
      if (!this.sessionId) this.showEntryScreen();
      if (!this.chatEnded) this.ui.input.focus();
      if (this.sessionId && this.visitorId) this.connectSocket();
    } else {
      this.socket?.disconnect();
      this.socket = null;
    }
  }

  private showEntryScreen(): void {
    if (this.needsPreChat() && !this.preChatComplete) {
      this.ui.welcome.classList.add("hidden");
      this.ui.prechat.classList.remove("hidden");
      this.ui.messages.classList.remove("active");
      this.ui.inputRow.classList.add("hidden");
      this.updatePreChatState();
      return;
    }
    this.ui.prechat.classList.add("hidden");
    this.ui.welcome.classList.remove("hidden");
    this.ui.messages.classList.remove("active");
    this.ui.inputRow.classList.remove("hidden");
  }

  private needsPreChat(): boolean {
    return this.config.requirePreChatName || this.config.requirePreChatEmail || !this.config.isOnline;
  }

  private updatePreChatState(): void {
    const nameOk = !this.config.requirePreChatName || this.ui.prechatName.value.trim().length > 0;
    const emailOk =
      !this.config.requirePreChatEmail ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.ui.prechatEmail.value.trim());
    this.ui.prechatStartBtn.disabled = !(nameOk && emailOk);
  }

  private completePreChat(): void {
    if (this.config.requirePreChatName) {
      this.visitorInfo.name = this.ui.prechatName.value.trim();
    }
    if (this.config.requirePreChatEmail || !this.config.isOnline) {
      this.visitorInfo.email = this.ui.prechatEmail.value.trim();
    }
    this.preChatComplete = true;
    this.ui.prechat.classList.add("hidden");
    this.ui.welcome.classList.remove("hidden");
    this.ui.inputRow.classList.remove("hidden");
    this.ui.input.focus();
  }

  private resizeInput(): void {
    this.ui.input.style.height = "auto";
    this.ui.input.style.height = `${Math.min(this.ui.input.scrollHeight, 100)}px`;
    this.updateSendState();
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
      return;
    }
    if (event.key === "Escape" && this.panelOpen) {
      this.setPanelOpen(false);
    }
  }

  private updateSendState(): void {
    const hasText = this.ui.input.value.trim().length > 0;
    const hasFiles = this.pendingAttachments.length > 0;
    this.ui.sendBtn.disabled = this.sending || this.chatEnded || (!hasText && !hasFiles);
  }

  private resetInput(): void {
    this.ui.input.value = "";
    this.ui.input.style.height = "auto";
    this.pendingAttachments = [];
    this.ui.fileInput.value = "";
    this.updateSendState();
  }

  private async handleFileSelect(): Promise<void> {
    const file = this.ui.fileInput.files?.[0];
    if (!file || !this.config.fileUploadEnabled) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) return;

    try {
      const presign = await this.api.presignUpload({
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("upload failed");

      this.pendingAttachments = [
        {
          name: file.name,
          mimeType: file.type,
          url: presign.url,
          size: file.size,
        },
      ];
      if (!this.ui.input.value.trim()) {
        this.ui.input.value = `📎 ${file.name}`;
      }
      this.updateSendState();
    } catch {
      this.messages.appendMsg("bot", "Unable to upload that image. Please try again.");
    }
  }

  private applyConfig(data?: Partial<WidgetConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...data };
    if (this.embedAccent) {
      this.config.accentColor = this.embedAccent;
    }

    this.ui.headerTitle.textContent = this.config.name || "Chat with us";
    this.ui.headerSubtitle.textContent = this.config.isOnline
      ? this.config.headerSubtitle
      : "We're currently offline";
    this.ui.welcomeTitle.textContent = this.config.welcomeTitle;
    this.ui.welcomeText.textContent = this.config.welcomeMessage;
    this.ui.prompts.replaceChildren();

    const prechatNameLabel = this.ui.prechat.querySelector(".prechat-name-label");
    const prechatEmailLabel = this.ui.prechat.querySelector(".prechat-email-label");
    if (prechatNameLabel) prechatNameLabel.textContent = this.config.preChatNameLabel;
    if (prechatEmailLabel) prechatEmailLabel.textContent = this.config.preChatEmailLabel;

    const nameField = this.ui.prechat.querySelector(".prechat-name-field");
    const emailField = this.ui.prechat.querySelector(".prechat-email-field");
    nameField?.classList.toggle("hidden", !this.config.requirePreChatName && this.config.isOnline);
    emailField?.classList.toggle(
      "hidden",
      !this.config.requirePreChatEmail && this.config.isOnline,
    );

    for (const text of this.config.quickPrompts) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prompt";
      btn.textContent = text;
      btn.addEventListener("click", () => {
        if (this.needsPreChat() && !this.preChatComplete) {
          this.ui.prechat.classList.remove("hidden");
          this.ui.welcome.classList.add("hidden");
          return;
        }
        this.ui.input.value = text;
        this.updateSendState();
        void this.sendMessage();
      });
      this.ui.prompts.appendChild(btn);
    }

    setIconElement(this.ui.launcherIcon, this.config.launcherIconUrl, CHAT_ICON_SVG);
    setIconElement(this.ui.welcomeIcon, this.config.avatarUrl, CHAT_ICON_SVG);

    this.ui.attachBtn.style.display = this.config.fileUploadEnabled ? "" : "none";

    const proactiveText = this.ui.proactiveBubble.querySelector(".proactive-text");
    if (proactiveText) proactiveText.textContent = this.config.proactiveMessage;

    applyWidgetTheme(this.ui, themeFromConfig(this.config));
    this.scheduleProactive();
  }

  private scheduleProactive(): void {
    if (this.proactiveTimer) clearTimeout(this.proactiveTimer);
    if (!this.config.proactiveEnabled || this.proactiveShown || this.panelOpen) return;
    this.proactiveTimer = setTimeout(() => {
      if (!this.panelOpen) {
        this.ui.proactiveBubble.classList.add("visible");
        this.proactiveShown = true;
      }
    }, this.config.proactiveDelaySeconds * 1000);
  }

  private hideProactive(): void {
    this.ui.proactiveBubble.classList.remove("visible");
  }

  private showCsat(prompt: string): void {
    const promptEl = this.ui.csat.querySelector(".csat-prompt");
    if (promptEl) promptEl.textContent = prompt;
    this.ui.csat.classList.remove("hidden");
    this.ui.messages.classList.remove("active");

    const starsEl = this.ui.csat.querySelector(".csat-stars");
    if (!starsEl) return;
    if (!starsEl.childElementCount) {
      starsEl.replaceChildren();
      for (let i = 1; i <= 5; i += 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "csat-star";
        btn.textContent = "★";
        btn.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
        btn.addEventListener("click", () => {
          this.csatRating = i;
          starsEl.querySelectorAll(".csat-star").forEach((star, idx) => {
            star.classList.toggle("active", idx < i);
          });
        });
        starsEl.appendChild(btn);
      }
    }
  }

  private async submitCsat(): Promise<void> {
    if (!this.sessionId || !this.csatRating) return;
    const submitBtn = this.ui.csat.querySelector<HTMLButtonElement>(".csat-submit");
    const commentEl = this.ui.csat.querySelector<HTMLTextAreaElement>(".csat-comment");
    const starsEl = this.ui.csat.querySelector(".csat-stars");
    if (!submitBtn) return;
    submitBtn.disabled = true;
    try {
      await this.api.submitCsat(
        this.sessionId,
        this.csatRating,
        commentEl?.value.trim() || undefined,
      );
      this.ui.csat.querySelector(".csat-thanks")?.classList.remove("hidden");
      submitBtn.style.display = "none";
      if (commentEl) commentEl.style.display = "none";
      if (starsEl) (starsEl as HTMLElement).style.display = "none";
    } catch {
      submitBtn.disabled = false;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      this.applyConfig(await this.api.getConfig());
    } catch {
      this.applyConfig(DEFAULT_CONFIG);
    }
  }

  private async restoreSession(id: string, visitorId: string): Promise<boolean> {
    const data = await this.api.getSession(id);
    if (data.status !== "active" || data.visitorId !== visitorId) {
      this.sessionStore.save(null);
      if (data.status === "closed" && !data.csatResponded && this.config.csatEnabled) {
        this.sessionId = id;
        this.visitorId = visitorId;
        this.chatEnded = true;
        this.messages.renderMessages(data.messages);
        this.showCsat(this.config.csatPrompt);
        return true;
      }
      return false;
    }

    this.sessionId = data.sessionId;
    this.visitorId = data.visitorId;
    this.seenMessageKeys.clear();
    for (const message of data.messages) {
      this.trackMessage(message.role, message.body, message.createdAt);
    }
    this.messages.renderMessages(data.messages);
    this.connectSocket();
    return true;
  }

  private async startChat(message: string, attachments?: PendingAttachment[]): Promise<void> {
    const data = await this.api.start(message, this.visitorInfo, attachments);
    this.sessionId = data.sessionId;
    this.visitorId = data.visitorId;
    this.persistSession();
    this.seenMessageKeys.clear();
    for (const msg of data.messages) {
      this.trackMessage(msg.role, msg.body, msg.createdAt);
    }
    this.messages.renderMessages(data.messages, data.articles);
    this.connectSocket();
  }

  private async sendMessage(): Promise<void> {
    if (this.chatEnded) return;
    if (this.needsPreChat() && !this.preChatComplete && !this.sessionId) {
      this.showEntryScreen();
      return;
    }

    let text = this.ui.input.value.trim();
    const attachments = [...this.pendingAttachments];
    if (!text && attachments.length) text = `📎 ${attachments[0]!.name}`;
    if (!text || this.sending) return;

    this.resetInput();
    this.sending = true;
    this.updateSendState();
    this.messages.setTyping(true);

    try {
      if (!this.sessionId) {
        await this.startChat(text, attachments.length ? attachments : undefined);
        return;
      }

      const data = await this.api.send(
        this.sessionId,
        text,
        attachments.length ? attachments : undefined,
      );
      if (data.message) {
        if (this.trackMessage("visitor", data.message.body, data.message.createdAt)) {
          this.messages.appendMsg(
            "visitor",
            data.message.body,
            data.message.createdAt,
            undefined,
            undefined,
            data.message.attachments,
          );
        }
      }
      if (data.reply) {
        if (this.trackMessage("bot", data.reply.body, data.reply.createdAt)) {
          this.messages.appendMsg("bot", data.reply.body, data.reply.createdAt, data.articles);
        }
      }
    } catch {
      this.messages.appendMsg(
        "bot",
        "Unable to send your message. Please check your connection and try again.",
      );
    } finally {
      this.messages.setTyping(false);
      this.sending = false;
      this.updateSendState();
      this.ui.input.focus();
    }
  }
}
