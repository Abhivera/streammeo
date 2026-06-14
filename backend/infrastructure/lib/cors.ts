export function parseWidgetAllowedOrigins(value: string | undefined): "*" | string[] {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "*") return "*";
  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function buildApiGatewayCorsOrigins(
  frontendUrl: string,
  widgetOriginsRaw?: string,
): { allowOrigins: string[]; allowCredentials: boolean } {
  const widgetOrigins = parseWidgetAllowedOrigins(widgetOriginsRaw);
  if (widgetOrigins === "*") {
    return { allowOrigins: ["*"], allowCredentials: false };
  }
  const origins = new Set<string>([frontendUrl, ...widgetOrigins]);
  return { allowOrigins: [...origins], allowCredentials: true };
}
