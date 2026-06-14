import { accentTint } from "./constants";
import type { WidgetTheme } from "./types";

export function buildStyles(theme: WidgetTheme): string {
  const accent = theme.accentColor;
  const accentSoft = accentTint(accent, 0.12);
  const accentHover = accentTint(accent, 0.08);
  const isLeft = theme.position === "bottom-left";
  const horizontal = isLeft ? "left" : "right";
  const launcherRadius = theme.launcherStyle === "rounded" ? "16px" : "50%";

  return `
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    .proactive-bubble {
      position: fixed; bottom: 92px; ${horizontal}: 24px; max-width: 260px;
      background: ${theme.panelBackground}; border: 1px solid #e5e7eb; border-radius: 14px;
      padding: 12px 36px 12px 14px; box-shadow: 0 8px 28px rgba(0,0,0,.14);
      z-index: 2147483645; display: none; animation: slideUp .25s ease;
    }
    .proactive-bubble.visible { display: block; }
    .proactive-text { margin: 0; font-size: 13px; color: ${theme.textColor}; line-height: 1.45; cursor: pointer; }
    .proactive-dismiss {
      position: absolute; top: 8px; right: 8px; width: 22px; height: 22px;
      border: none; background: transparent; color: #9ca3af; cursor: pointer; font-size: 12px;
    }
    .launcher {
      position: fixed; bottom: 24px; ${horizontal}: 24px; width: 56px; height: 56px;
      border-radius: ${launcherRadius}; border: none; background: ${accent}; color: #fff; cursor: pointer;
      box-shadow: 0 4px 24px rgba(0,0,0,.22); z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s ease, box-shadow .2s ease; overflow: hidden;
    }
    .launcher:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(0,0,0,.28); }
    .launcher-icon { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; }
    .launcher-icon svg { width: 26px; height: 26px; }
    .launcher-icon img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
    .panel {
      position: fixed; bottom: 92px; ${horizontal}: 24px; width: 380px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 120px);
      background: ${theme.panelBackground}; border-radius: 16px; box-shadow: 0 12px 48px rgba(0,0,0,.18);
      display: none; flex-direction: column; overflow: hidden; z-index: 2147483647;
      border: 1px solid rgba(0,0,0,.06);
      animation: slideUp .25s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .panel.open { display: flex; }
    .header {
      background: ${accent}; color: #fff; padding: 16px 18px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .header-info { min-width: 0; }
    .header-title { font-weight: 600; font-size: 15px; line-height: 1.3; }
    .header-sub { font-size: 12px; opacity: .88; margin-top: 2px; }
    .header-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .icon-btn {
      width: 32px; height: 32px; border: none; border-radius: 8px;
      background: rgba(255,255,255,.18); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: rgba(255,255,255,.28); }
    .body { flex: 1; display: flex; flex-direction: column; min-height: 0; background: ${theme.chatBackground}; position: relative; }
    .welcome {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 28px 24px; text-align: center;
    }
    .welcome.hidden, .prechat.hidden, .csat.hidden, .field.hidden { display: none; }
    .welcome-icon {
      width: 48px; height: 48px; border-radius: 50%; background: ${accent};
      color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; overflow: hidden;
    }
    .welcome-icon svg { width: 22px; height: 22px; }
    .welcome-icon img { width: 100%; height: 100%; object-fit: cover; }
    .welcome h3 { margin: 0 0 8px; font-size: 18px; color: ${theme.textColor}; font-weight: 600; }
    .welcome p { margin: 0 0 20px; font-size: 14px; color: ${theme.mutedTextColor}; line-height: 1.5; max-width: 280px; }
    .prechat {
      flex: 1; display: flex; flex-direction: column; padding: 24px; gap: 12px;
    }
    .prechat h3 { margin: 0; font-size: 17px; color: ${theme.textColor}; }
    .prechat p { margin: 0; font-size: 13px; color: ${theme.mutedTextColor}; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field span { font-size: 12px; font-weight: 500; color: ${theme.textColor}; }
    .field input {
      border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px;
      font-size: 14px; color: ${theme.textColor}; background: ${theme.panelBackground};
    }
    .field input:focus { outline: none; border-color: ${accent}; box-shadow: 0 0 0 3px ${accentSoft}; }
    .prechat-start {
      margin-top: 4px; background: ${accent}; color: #fff; border: none; border-radius: 10px;
      padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .prechat-start:disabled { opacity: .45; cursor: not-allowed; }
    .prompts { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 300px; }
    .prompt {
      padding: 10px 14px; border-radius: 10px; border: 1px solid #dde1e6;
      background: ${theme.panelBackground}; color: ${theme.textColor}; font-size: 13px; cursor: pointer; text-align: left;
      transition: border-color .15s, background .15s;
    }
    .prompt:hover { border-color: ${accent}; background: ${accentHover}; }
    .messages {
      flex: 1; overflow-y: auto; padding: 16px 14px; display: none; flex-direction: column; gap: 12px;
    }
    .messages.active { display: flex; }
    .msg-wrap { display: flex; flex-direction: column; max-width: 88%; }
    .msg-wrap.visitor { align-self: flex-end; align-items: flex-end; }
    .msg-wrap.bot, .msg-wrap.agent { align-self: flex-start; align-items: flex-start; }
    .msg-meta { font-size: 11px; color: #8b919a; margin-bottom: 4px; padding: 0 4px; }
    .msg {
      padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.45;
      word-break: break-word;
    }
    .msg.visitor { background: ${accent}; color: #fff; border-bottom-right-radius: 4px; }
    .msg.bot, .msg.agent {
      background: ${theme.panelBackground}; color: ${theme.textColor}; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px;
    }
    .msg-attachments { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
    .msg-attachment img {
      max-width: 200px; max-height: 160px; border-radius: 8px; display: block; cursor: pointer;
    }
    .articles { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; width: 100%; }
    .article {
      padding: 10px 12px; border-radius: 10px; background: ${theme.panelBackground};
      border: 1px solid #e5e7eb; text-align: left; cursor: pointer;
      transition: border-color .15s;
    }
    .article:hover { border-color: ${accent}; }
    .article-title { font-size: 13px; font-weight: 600; color: ${theme.textColor}; margin: 0 0 4px; }
    .article-excerpt { font-size: 12px; color: ${theme.mutedTextColor}; margin: 0; line-height: 1.4; }
    .article.expanded .article-excerpt { white-space: pre-wrap; }
    .typing {
      display: none; align-self: flex-start; margin: 0 14px 8px; padding: 10px 14px; border-radius: 14px;
      background: ${theme.panelBackground}; border: 1px solid #e5e7eb; font-size: 13px; color: #8b919a;
    }
    .typing.active { display: block; }
    .typing-dots span {
      display: inline-block; width: 6px; height: 6px; margin: 0 1px;
      border-radius: 50%; background: #adb5bd;
      animation: blink 1.2s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: .2s; }
    .typing-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink {
      0%, 80%, 100% { opacity: .3; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-3px); }
    }
    .csat {
      position: absolute; inset: 0; background: ${theme.chatBackground};
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; text-align: center; z-index: 2;
    }
    .csat-prompt { margin: 0 0 14px; font-size: 15px; font-weight: 600; color: ${theme.textColor}; }
    .csat-stars { display: flex; gap: 8px; margin-bottom: 12px; }
    .csat-star {
      width: 36px; height: 36px; border: 1px solid #d1d5db; border-radius: 8px;
      background: ${theme.panelBackground}; color: #d1d5db; font-size: 18px; cursor: pointer;
    }
    .csat-star.active, .csat-star:hover { border-color: ${accent}; color: ${accent}; }
    .csat-comment {
      width: 100%; max-width: 280px; border: 1px solid #d1d5db; border-radius: 10px;
      padding: 10px 12px; font-size: 13px; resize: none; margin-bottom: 10px;
      color: ${theme.textColor}; background: ${theme.panelBackground};
    }
    .csat-submit {
      background: ${accent}; color: #fff; border: none; border-radius: 10px;
      padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .csat-submit:disabled { opacity: .45; cursor: not-allowed; }
    .csat-thanks { margin: 12px 0 0; font-size: 13px; color: ${theme.mutedTextColor}; }
    .input-row {
      display: flex; align-items: flex-end; gap: 8px;
      border-top: 1px solid #e5e7eb; padding: 12px; background: ${theme.panelBackground};
    }
    .input-row.hidden { display: none; }
    .attach-btn {
      background: transparent; color: ${theme.mutedTextColor}; border: 1px solid #d1d5db;
      border-radius: 10px; width: 42px; height: 42px; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .attach-btn:disabled { opacity: .4; cursor: not-allowed; }
    .input-row textarea {
      flex: 1; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px;
      font-size: 14px; resize: none; min-height: 42px; max-height: 100px;
      line-height: 1.4; font-family: inherit; color: ${theme.textColor};
    }
    .input-row textarea:focus { outline: none; border-color: ${accent}; box-shadow: 0 0 0 3px ${accentSoft}; }
    .send-btn {
      background: ${accent}; color: #fff; border: none; border-radius: 10px;
      width: 42px; height: 42px; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .15s;
    }
    .send-btn:disabled { opacity: .45; cursor: not-allowed; }
    .footer-note {
      padding: 6px 12px 10px; font-size: 11px; color: #9ca3af; text-align: center; background: ${theme.panelBackground};
    }
    @media (max-width: 480px) {
      .panel, .proactive-bubble { ${horizontal}: 16px; }
      .panel { bottom: 84px; width: calc(100vw - 32px); height: calc(100vh - 100px); }
      .proactive-bubble { bottom: 84px; }
      .launcher { ${horizontal}: 16px; bottom: 16px; }
    }
  `;
}
