import type { ChatAttachment, ChatMessage, ChatRole, KbArticle, WidgetUi } from "./types";

export function normalizeRole(role: string): ChatRole {
  if (role === "visitor") return "visitor";
  if (role === "agent") return "agent";
  return "bot";
}

export function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function renderAttachments(container: HTMLElement, attachments: ChatAttachment[]) {
  if (!attachments.length) return;
  const wrap = document.createElement("div");
  wrap.className = "msg-attachments";
  for (const file of attachments) {
    if (!file.mimeType.startsWith("image/")) continue;
    const link = document.createElement("a");
    link.className = "msg-attachment";
    link.href = file.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const img = document.createElement("img");
    img.src = file.url;
    img.alt = file.name;
    link.appendChild(img);
    wrap.appendChild(link);
  }
  if (wrap.childElementCount) container.appendChild(wrap);
}

export function createMessageRenderer(ui: WidgetUi, getAgentName: () => string) {
  function roleLabel(role: ChatRole): string {
    return role === "visitor" ? "You" : getAgentName();
  }

  function scrollToBottom() {
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function showChatView() {
    ui.welcome.classList.add("hidden");
    ui.prechat.classList.add("hidden");
    ui.messages.classList.add("active");
    ui.inputRow.classList.remove("hidden");
  }

  function renderArticles(container: HTMLElement, articles: KbArticle[]) {
    if (!articles.length) return;

    const wrap = document.createElement("div");
    wrap.className = "articles";

    for (const article of articles) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "article";

      const title = document.createElement("p");
      title.className = "article-title";
      title.textContent = article.title;

      const excerpt = document.createElement("p");
      excerpt.className = "article-excerpt";
      excerpt.textContent = article.excerpt;

      card.append(title, excerpt);
      card.addEventListener("click", () => card.classList.toggle("expanded"));
      wrap.appendChild(card);
    }

    container.appendChild(wrap);
  }

  function appendMsg(
    role: ChatRole,
    body: string,
    createdAt?: string,
    articles?: KbArticle[],
    authorLabel?: string,
    attachments?: ChatAttachment[],
  ) {
    const wrap = document.createElement("div");
    wrap.className = `msg-wrap ${role}`;

    const meta = document.createElement("div");
    meta.className = "msg-meta";
    const label = authorLabel ?? roleLabel(role);
    meta.textContent = label + (createdAt ? ` · ${formatTime(createdAt)}` : "");
    wrap.appendChild(meta);

    const bubble = document.createElement("div");
    bubble.className = `msg ${role}`;
    if (body) bubble.textContent = body;
    wrap.appendChild(bubble);

    if (attachments?.length) renderAttachments(wrap, attachments);
    if (articles?.length) renderArticles(wrap, articles);

    ui.messages.appendChild(wrap);
    scrollToBottom();
  }

  function renderMessages(messages: ChatMessage[], articles?: KbArticle[]) {
    ui.messages.replaceChildren();
    showChatView();

    messages.forEach((message, index) => {
      const role = normalizeRole(message.role);
      const showArticles =
        articles?.length && index === messages.length - 1 && role === "bot" ? articles : undefined;
      const authorLabel =
        role === "agent" ? (message.agentName ?? getAgentName()) : undefined;
      appendMsg(
        role,
        message.body,
        message.createdAt,
        showArticles,
        authorLabel,
        message.attachments,
      );
    });
  }

  function setTyping(on: boolean, label?: string) {
    ui.typing.classList.toggle("active", on);
    if (on) {
      if (label) {
        ui.typing.innerHTML = `${label} <span class="typing-dots"><span></span><span></span><span></span></span>`;
      } else {
        ui.typing.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
      }
      scrollToBottom();
    }
  }

  return { appendMsg, renderMessages, setTyping, showChatView };
}
