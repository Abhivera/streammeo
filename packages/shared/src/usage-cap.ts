/**
 * Voice is blocked only when the workspace has a positive minute cap.
 * Prototype builds use `minutes_limit = 0` (uncapped). Later metered billing
 * can set a cap and still use `minutes_used` from sessions as source of truth.
 */
export function isUsageCapEnforced(minutesLimit: number): boolean {
  return minutesLimit > 0;
}
