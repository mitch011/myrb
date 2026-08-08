/**
 * Best-effort haptic feedback via the Vibration API. Note: iOS Safari does
 * not implement navigator.vibrate at all (a platform limitation, not a bug
 * here) — this silently no-ops there and works on Android/other browsers
 * that support it.
 */
let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function vibrate(pattern: number | readonly number[]): void {
  if (!hapticsEnabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern as number | number[]);
  }
}

export const HAPTIC_PATTERNS = {
  hit: 10,
  perfect: 16,
  overdriveActivate: [0, 30, 40, 60],
} as const;
