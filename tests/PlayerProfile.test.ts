import { beforeEach, describe, expect, it } from "vitest";
import { getBestResult, recordResult } from "@models/PlayerProfile";
import type { PlayStats } from "@models/Score";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

function stats(overrides: Partial<PlayStats> = {}): PlayStats {
  return {
    score: 1000,
    maxCombo: 20,
    perfectCount: 10,
    greatCount: 5,
    goodCount: 2,
    missCount: 1,
    totalNotes: 18,
    accuracyFraction: 0.8,
    stars: 4,
    failed: false,
    ...overrides,
  };
}

describe("PlayerProfile save data", () => {
  it("returns null when nothing is saved yet", () => {
    expect(getBestResult("cherub-rock", "hard")).toBeNull();
  });

  it("records a first result", () => {
    recordResult("cherub-rock", "hard", stats());
    const best = getBestResult("cherub-rock", "hard");
    expect(best?.bestScore).toBe(1000);
    expect(best?.bestStars).toBe(4);
  });

  it("keeps the higher score across two plays", () => {
    recordResult("cherub-rock", "hard", stats({ score: 1000 }));
    recordResult("cherub-rock", "hard", stats({ score: 500 }));
    expect(getBestResult("cherub-rock", "hard")?.bestScore).toBe(1000);

    recordResult("cherub-rock", "hard", stats({ score: 2000 }));
    expect(getBestResult("cherub-rock", "hard")?.bestScore).toBe(2000);
  });

  it("keeps each stat's own best independently", () => {
    recordResult("cherub-rock", "hard", stats({ score: 2000, maxCombo: 10, stars: 3 }));
    recordResult("cherub-rock", "hard", stats({ score: 1000, maxCombo: 50, stars: 5 }));
    const best = getBestResult("cherub-rock", "hard");
    expect(best?.bestScore).toBe(2000);
    expect(best?.bestCombo).toBe(50);
    expect(best?.bestStars).toBe(5);
  });

  it("keeps difficulties separate", () => {
    recordResult("cherub-rock", "easy", stats({ score: 100 }));
    recordResult("cherub-rock", "hard", stats({ score: 900 }));
    expect(getBestResult("cherub-rock", "easy")?.bestScore).toBe(100);
    expect(getBestResult("cherub-rock", "hard")?.bestScore).toBe(900);
  });
});
