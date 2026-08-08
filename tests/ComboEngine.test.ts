import { describe, expect, it } from "vitest";
import { ComboEngine } from "@core/ComboEngine";

describe("ComboEngine", () => {
  it("starts at combo 0 and multiplier 1x", () => {
    const engine = new ComboEngine();
    expect(engine.combo).toBe(0);
    expect(engine.multiplier).toBe(1);
  });

  it("increments combo on each hit", () => {
    const engine = new ComboEngine();
    engine.registerHit();
    engine.registerHit();
    expect(engine.combo).toBe(2);
  });

  it("resets combo to 0 on a miss", () => {
    const engine = new ComboEngine();
    engine.registerHit();
    engine.registerHit();
    engine.registerMiss();
    expect(engine.combo).toBe(0);
  });

  it("steps the multiplier at the configured thresholds", () => {
    const engine = new ComboEngine();
    for (let i = 0; i < 9; i++) engine.registerHit();
    expect(engine.multiplier).toBe(1);

    engine.registerHit(); // combo = 10
    expect(engine.multiplier).toBe(2);

    for (let i = 0; i < 9; i++) engine.registerHit(); // combo = 19
    expect(engine.multiplier).toBe(2);

    engine.registerHit(); // combo = 20
    expect(engine.multiplier).toBe(3);

    for (let i = 0; i < 9; i++) engine.registerHit(); // combo = 29
    expect(engine.multiplier).toBe(3);

    engine.registerHit(); // combo = 30
    expect(engine.multiplier).toBe(4);
  });

  it("caps the multiplier at maxMultiplier even with a huge combo", () => {
    const engine = new ComboEngine();
    for (let i = 0; i < 500; i++) engine.registerHit();
    expect(engine.multiplier).toBe(4);
  });

  it("tracks the best combo across a miss", () => {
    const engine = new ComboEngine();
    for (let i = 0; i < 15; i++) engine.registerHit();
    engine.registerMiss();
    engine.registerHit();
    expect(engine.maxCombo).toBe(15);
    expect(engine.combo).toBe(1);
  });
});
