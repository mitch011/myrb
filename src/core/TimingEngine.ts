import type { Judgment, TimingWindowsMs } from "./TimingConfiguration";

/**
 * Pure timing classification. Takes a delta between when a note should be
 * hit and when the player actually tapped, and returns a judgment — or null
 * if the tap is outside every window and should be ignored entirely (too far
 * in the past/future to be "for" this note).
 */
export function classifyDelta(deltaSeconds: number, windows: TimingWindowsMs): Judgment | null {
  const absMs = Math.abs(deltaSeconds) * 1000;
  if (absMs <= windows.perfect) return "perfect";
  if (absMs <= windows.great) return "great";
  if (absMs <= windows.good) return "good";
  return null;
}

/** The largest window in which a note can still be judged (not yet a miss). */
export function maxJudgeableWindowSeconds(windows: TimingWindowsMs): number {
  return windows.good / 1000;
}
