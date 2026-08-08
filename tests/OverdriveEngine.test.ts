import { describe, expect, it } from "vitest";
import { OverdriveEngine } from "@core/OverdriveEngine";
import { DEFAULT_OVERDRIVE_CONFIG } from "@core/OverdriveConfiguration";

describe("OverdriveEngine", () => {
  it("starts empty and not ready", () => {
    const engine = new OverdriveEngine();
    expect(engine.meter).toBe(0);
    expect(engine.isReady).toBe(false);
  });

  it("becomes ready once the meter reaches the activation threshold", () => {
    const engine = new OverdriveEngine();
    const hitsNeeded = Math.ceil(
      DEFAULT_OVERDRIVE_CONFIG.activationThreshold / DEFAULT_OVERDRIVE_CONFIG.chargePerSpecialHit
    );
    for (let i = 0; i < hitsNeeded - 1; i++) engine.chargeFromSpecialHit();
    expect(engine.isReady).toBe(false);
    engine.chargeFromSpecialHit();
    expect(engine.isReady).toBe(true);
  });

  it("caps the meter at the activation threshold", () => {
    const engine = new OverdriveEngine();
    for (let i = 0; i < 20; i++) engine.chargeFromSpecialHit();
    expect(engine.meter).toBe(DEFAULT_OVERDRIVE_CONFIG.activationThreshold);
  });

  it("refuses to activate when not ready", () => {
    const engine = new OverdriveEngine();
    engine.chargeFromSpecialHit();
    expect(engine.activate()).toBe(false);
    expect(engine.isActive).toBe(false);
  });

  it("activates when ready and applies the score multiplier bonus", () => {
    const engine = new OverdriveEngine();
    for (let i = 0; i < 10; i++) engine.chargeFromSpecialHit();
    expect(engine.activate()).toBe(true);
    expect(engine.isActive).toBe(true);
    expect(engine.scoreMultiplierBonus).toBe(DEFAULT_OVERDRIVE_CONFIG.scoreMultiplierBonus);
  });

  it("drains over time while active and deactivates at zero", () => {
    const engine = new OverdriveEngine();
    for (let i = 0; i < 10; i++) engine.chargeFromSpecialHit();
    engine.activate();

    const fullDrainSeconds =
      DEFAULT_OVERDRIVE_CONFIG.activationThreshold / DEFAULT_OVERDRIVE_CONFIG.drainPerSecond;
    engine.update(fullDrainSeconds / 2);
    expect(engine.isActive).toBe(true);
    expect(engine.meter).toBeGreaterThan(0);

    engine.update(fullDrainSeconds / 2 + 0.01);
    expect(engine.isActive).toBe(false);
    expect(engine.meter).toBe(0);
    expect(engine.scoreMultiplierBonus).toBe(1);
  });

  it("does not charge further while already active", () => {
    const engine = new OverdriveEngine();
    for (let i = 0; i < 10; i++) engine.chargeFromSpecialHit();
    engine.activate();
    engine.update(1);
    const meterAfterDrain = engine.meter;
    engine.chargeFromSpecialHit();
    expect(engine.meter).toBe(meterAfterDrain);
  });

  it("resets to empty and inactive", () => {
    const engine = new OverdriveEngine();
    for (let i = 0; i < 10; i++) engine.chargeFromSpecialHit();
    engine.activate();
    engine.reset();
    expect(engine.meter).toBe(0);
    expect(engine.isActive).toBe(false);
  });
});
