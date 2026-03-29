/** Main-timer running focus before a break offer (25 minutes). */
export const FOCUS_INTERVAL_SEC = 25 * 60

/** Default break countdown length when user presses Play. */
export const DEFAULT_BREAK_DURATION_SEC = 5 * 60

/** Pomodoro break length (1 min … 60 min). */
export function clampBreakDurationSec(sec: number): number {
  return Math.max(60, Math.min(60 * 60, Math.floor(sec)))
}
