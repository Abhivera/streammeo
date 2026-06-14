import type { AppConfig } from "./config.js";

export type WidgetOriginPolicy = "*" | string[];

export function parseWidgetAllowedOrigins(value: string | undefined): WidgetOriginPolicy {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "*") return "*";
  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(
  origin: string | undefined,
  frontendUrl: string,
  widgetOrigins: WidgetOriginPolicy,
): boolean {
  if (!origin) return true;
  if (origin === frontendUrl) return true;
  if (widgetOrigins === "*") return true;
  return widgetOrigins.includes(origin);
}

export function buildFastifyCorsOptions(config: AppConfig) {
  const widgetOrigins = parseWidgetAllowedOrigins(config.WIDGET_ALLOWED_ORIGINS);
  const allowAnyWidget = widgetOrigins === "*";

  return {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (isOriginAllowed(origin, config.FRONTEND_URL, widgetOrigins)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    // Bearer / x-api-key auth — not cookies. Disable credentials when widget allows any origin.
    credentials: !allowAnyWidget,
  };
}

export function buildApiGatewayCorsOrigins(frontendUrl: string, widgetOriginsRaw?: string): {
  allowOrigins: string[];
  allowCredentials: boolean;
} {
  const widgetOrigins = parseWidgetAllowedOrigins(widgetOriginsRaw);
  if (widgetOrigins === "*") {
    return { allowOrigins: ["*"], allowCredentials: false };
  }
  const origins = new Set<string>([frontendUrl, ...widgetOrigins]);
  return { allowOrigins: [...origins], allowCredentials: true };
}
