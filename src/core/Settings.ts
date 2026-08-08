export interface GameSettings {
  /** Milliseconds to shift note timing to compensate for audio output latency. */
  audioOffsetMs: number;
  /** Milliseconds to shift note timing to compensate for touch/input latency. */
  inputOffsetMs: number;
  noFailMode: boolean;
  hapticsEnabled: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  audioOffsetMs: 0,
  inputOffsetMs: 0,
  noFailMode: false,
  hapticsEnabled: true,
};

const STORAGE_KEY = "rockband-web:settings";

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — settings just won't persist across sessions.
  }
}

/** Total timing correction, in seconds, to add to (now - note.timestamp) before judging a hit. */
export function calibrationOffsetSeconds(settings: GameSettings): number {
  return (settings.audioOffsetMs + settings.inputOffsetMs) / 1000;
}
