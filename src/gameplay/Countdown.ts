export const COUNTDOWN_LEAD_SECONDS = 3;

/**
 * Pure function of "seconds until the song's t=0" so the on-screen countdown
 * is derived from the same audio-backed clock the notes move against,
 * instead of a separate setTimeout ticking down on its own.
 */
export function countdownLabel(secondsRemaining: number): string | null {
  if (secondsRemaining > COUNTDOWN_LEAD_SECONDS) return null;
  if (secondsRemaining > 2) return "3";
  if (secondsRemaining > 1) return "2";
  if (secondsRemaining > 0) return "1";
  if (secondsRemaining > -0.6) return "ROCK!";
  return null;
}
