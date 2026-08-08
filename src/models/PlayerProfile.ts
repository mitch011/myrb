import type { PlayStats } from "./Score";

export interface BestResult {
  bestScore: number;
  bestAccuracyFraction: number;
  bestCombo: number;
  bestStars: number;
}

type SaveDataStore = Record<string, BestResult>;

const STORAGE_KEY = "rockband-web:save-data";

function loadStore(): SaveDataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Storage unavailable (private browsing, disabled, quota) — play on without persistence.
    return {};
  }
}

function saveStore(store: SaveDataStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Same as above — silently skip rather than interrupting play.
  }
}

function keyFor(songId: string, difficulty: string): string {
  return `${songId}:${difficulty}`;
}

export function getBestResult(songId: string, difficulty: string): BestResult | null {
  return loadStore()[keyFor(songId, difficulty)] ?? null;
}

/** Merges a completed play's stats into the stored best-of for this song+difficulty. */
export function recordResult(songId: string, difficulty: string, result: PlayStats): BestResult {
  const store = loadStore();
  const key = keyFor(songId, difficulty);
  const existing = store[key];

  const updated: BestResult = {
    bestScore: Math.max(existing?.bestScore ?? 0, result.score),
    bestAccuracyFraction: Math.max(existing?.bestAccuracyFraction ?? 0, result.accuracyFraction),
    bestCombo: Math.max(existing?.bestCombo ?? 0, result.maxCombo),
    bestStars: Math.max(existing?.bestStars ?? 0, result.stars),
  };
  store[key] = updated;
  saveStore(store);
  return updated;
}
