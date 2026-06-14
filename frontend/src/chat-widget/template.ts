import { CHAT_ICON_SVG } from "./constants";

export function buildMarkup(): string {
  return `
    <div class="proactive-bubble" role="status" aria-live="polite">
      <button class="proactive-dismiss" type="button" aria-label="Dismiss">✕</button>
      <p class="proactive-text"></p>
    </div>
    <button class="launcher" type="button" aria-label="Open chat">
      <span class="launcher-icon">${CHAT_ICON_SVG}</span>
    </button>
    <div class="panel" role="dialog" aria-label="Live chat">
      <div class="header">
        <div class="header-info">
          <div class="header-title">Chat with us</div>
          <div class="header-sub">We typically reply within a few minutes</div>
        </div>
        <div class="header-actions">
          <button class="icon-btn close-btn" type="button" aria-label="Close chat">✕</button>
        </div>
      </div>
      <div class="body">
        <div class="welcome">
          <span class="welcome-icon">${CHAT_ICON_SVG}</span>
          <h3>How can we help?</h3>
          <p>Send us a message and we'll get back to you as soon as we can.</p>
          <div class="prompts"></div>
        </div>
        <div class="prechat hidden">
          <h3>Before we start</h3>
          <p>Share your details so we can help you better.</p>
        <label class="field prechat-name-field">
          <span class="prechat-name-label">Your name</span>
          <input class="prechat-name" type="text" autocomplete="name" />
        </label>
        <label class="field prechat-email-field">
          <span class="prechat-email-label">Your email</span>
          <input class="prechat-email" type="email" autocomplete="email" />
        </label>
          <button class="prechat-start" type="button">Start chat</button>
        </div>
        <div class="messages"></div>
        <div class="typing"><span class="typing-dots"><span></span><span></span><span></span></span></div>
        <div class="csat hidden">
          <p class="csat-prompt">How was your chat experience?</p>
          <div class="csat-stars" role="group" aria-label="Rate your experience"></div>
          <textarea class="csat-comment" rows="2" placeholder="Optional feedback…"></textarea>
          <button class="csat-submit" type="button">Submit feedback</button>
          <p class="csat-thanks hidden">Thanks for your feedback!</p>
        </div>
      </div>
      <div class="input-row">
        <input class="file-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden />
        <button class="attach-btn" type="button" aria-label="Attach image" title="Attach image">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <textarea rows="1" placeholder="Type a message…" aria-label="Message"></textarea>
        <button class="send-btn" type="button" aria-label="Send message" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="footer-note">Powered by Streammeo</div>
    </div>
  `;
}
