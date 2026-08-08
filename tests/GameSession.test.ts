import { describe, expect, it } from "vitest";
import { GameSession } from "@core/GameSession";
import type { SongClock } from "@core/GameClock";
import { DRUM_LANES } from "@chart/LaneConfiguration";
import type { Note } from "@chart/Note";
import { DEFAULT_OVERDRIVE_CONFIG } from "@core/OverdriveConfiguration";

class ManualClock implements SongClock {
  currentTime = 0;
  isPlaying = false;
  start(): void {
    this.isPlaying = true;
  }
  pause(): void {
    this.isPlaying = false;
  }
  resume(): void {
    this.isPlaying = true;
  }
  seek(seconds: number): void {
    this.currentTime = seconds;
  }
  restart(): void {
    this.currentTime = 0;
    this.isPlaying = true;
  }
}

function specialNote(lane: number, timestamp: number): Note {
  return { id: `s-${lane}-${timestamp}`, timestamp, lane, duration: 0, type: "special" };
}

describe("GameSession Overdrive integration", () => {
  it("charges Overdrive when a special note is hit dead-on", () => {
    const clock = new ManualClock();
    const notes = [specialNote(0, 1.0)];
    const session = new GameSession(notes, clock, DRUM_LANES);
    session.start();

    clock.currentTime = 1.0;
    const event = session.handleHit(0);

    expect(event?.judgment).toBe("perfect");
    expect(session.overdriveEngine.meter).toBe(DEFAULT_OVERDRIVE_CONFIG.chargePerSpecialHit);
  });

  it("applies the Overdrive score bonus once active", () => {
    const clock = new ManualClock();
    const hitsNeeded = Math.ceil(
      DEFAULT_OVERDRIVE_CONFIG.activationThreshold / DEFAULT_OVERDRIVE_CONFIG.chargePerSpecialHit
    );
    const notes = Array.from({ length: hitsNeeded }, (_, i) => specialNote(0, i * 1));
    const session = new GameSession(notes, clock, DRUM_LANES);
    session.start();

    for (let i = 0; i < hitsNeeded; i++) {
      clock.currentTime = i;
      session.handleHit(0);
    }
    expect(session.overdriveEngine.isReady).toBe(true);
    expect(session.activateOverdrive()).toBe(true);
    expect(session.effectiveMultiplier).toBe(1 * DEFAULT_OVERDRIVE_CONFIG.scoreMultiplierBonus);
  });

  it("refuses to activate Overdrive before the session has started", () => {
    const clock = new ManualClock();
    const session = new GameSession([specialNote(0, 1.0)], clock, DRUM_LANES);
    expect(session.activateOverdrive()).toBe(false);
  });
});
