/**
 * Voice is blocked only when the workspace has a positive minute cap.
 * Prototype builds use `minutesLimit = 0` (uncapped). Metered billing can set a cap;
 * `minutesUsed` on the workspace is incremented when voice turns finalize in the backend.
 */
export function isUsageCapEnforced(minutesLimit: number): boolean {
  return minutesLimit > 0;
}
