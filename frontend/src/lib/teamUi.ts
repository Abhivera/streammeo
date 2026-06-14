export function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function formatSeatLimit(limit: number): string {
  return limit >= Number.MAX_SAFE_INTEGER ? "∞" : String(limit);
}

export function formatUsageLimit(limit: number): string {
  return formatSeatLimit(limit);
}

export function formatAiRepliesPlanDetail(limit: number): string {
  if (limit >= Number.MAX_SAFE_INTEGER) return "Unlimited AI replies";
  if (limit === 0) return "No AI replies";
  return `${limit} AI replies/mo`;
}

export function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
