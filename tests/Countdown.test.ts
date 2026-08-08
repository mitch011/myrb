import { describe, expect, it } from "vitest";
import { countdownLabel } from "@gameplay/Countdown";

describe("countdownLabel", () => {
  it('shows "3" well before the song starts', () => {
    expect(countdownLabel(2.9)).toBe("3");
  });

  it('shows "2" in the middle window', () => {
    expect(countdownLabel(1.9)).toBe("2");
  });

  it('shows "1" in the final second', () => {
    expect(countdownLabel(0.5)).toBe("1");
  });

  it('shows "ROCK!" right as the song starts', () => {
    expect(countdownLabel(0)).toBe("ROCK!");
    expect(countdownLabel(-0.3)).toBe("ROCK!");
  });

  it("shows nothing once the ROCK! flash has passed", () => {
    expect(countdownLabel(-1)).toBeNull();
  });

  it("shows nothing long before the countdown window", () => {
    expect(countdownLabel(10)).toBeNull();
  });
});
