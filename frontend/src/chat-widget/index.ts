import { DEFAULT_ACCENT } from "./constants";
import { ChatWidget } from "./widget";

function bootstrap(): void {
  const script = document.currentScript;
  if (!script) return;

  const apiKey = script.getAttribute("data-api-key");
  const apiBase = script.getAttribute("data-api-url") ?? "";
  const embedAccent = script.hasAttribute("data-accent")
    ? script.getAttribute("data-accent") ?? DEFAULT_ACCENT
    : null;
  const locale = script.getAttribute("data-locale");
  const widgetId = script.getAttribute("data-widget-id");

  if (!apiKey) {
    console.error("[Streammeo] data-api-key is required");
    return;
  }

  new ChatWidget({ apiKey, apiBase, embedAccent, locale, widgetId }).init();
}

bootstrap();
