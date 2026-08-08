import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, calibrationOffsetSeconds, loadSettings, saveSettings } from "@core/Settings";

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

describe("Settings", () => {
  it("loads defaults when nothing is saved", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips saved settings", () => {
    saveSettings({ audioOffsetMs: 40, inputOffsetMs: -20, noFailMode: true, hapticsEnabled: false });
    expect(loadSettings()).toEqual({
      audioOffsetMs: 40,
      inputOffsetMs: -20,
      noFailMode: true,
      hapticsEnabled: false,
    });
  });

  it("computes the calibration offset in seconds from both ms fields", () => {
    expect(calibrationOffsetSeconds({ ...DEFAULT_SETTINGS, audioOffsetMs: 30, inputOffsetMs: 20 })).toBeCloseTo(
      0.05
    );
    expect(
      calibrationOffsetSeconds({ ...DEFAULT_SETTINGS, audioOffsetMs: -30, inputOffsetMs: 10 })
    ).toBeCloseTo(-0.02);
  });
});
