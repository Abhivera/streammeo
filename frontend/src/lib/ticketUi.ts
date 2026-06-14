export function priorityTextClass(priority: string): string {
  const map: Record<string, string> = {
    low: "text-vw-muted",
    normal: "text-vw-fg-soft",
    high: "text-vw-warning",
    urgent: "text-vw-danger",
  };
  return map[priority] ?? "text-vw-fg-soft";
}
