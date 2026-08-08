import { describe, expect, it } from "vitest";
import { PerformanceMeter } from "@core/PerformanceMeter";

describe("PerformanceMeter", () => {
  it("starts at the configured starting health", () => {
    const meter = new PerformanceMeter();
    expect(meter.value).toBe(50);
    expect(meter.hasFailed).toBe(false);
  });

  it("drains on misses and can reach failure", () => {
    const meter = new PerformanceMeter();
    for (let i = 0; i < 9; i++) meter.registerJudgment("miss");
    expect(meter.hasFailed).toBe(true);
    expect(meter.value).toBe(0);
  });

  it("clamps at max health on repeated hits", () => {
    const meter = new PerformanceMeter();
    for (let i = 0; i < 50; i++) meter.registerJudgment("perfect");
    expect(meter.value).toBe(100);
  });

  it("never fails in no-fail mode", () => {
    const meter = new PerformanceMeter(undefined, true);
    for (let i = 0; i < 20; i++) meter.registerJudgment("miss");
    expect(meter.value).toBe(0);
    expect(meter.hasFailed).toBe(false);
  });

  it("resets to starting health", () => {
    const meter = new PerformanceMeter();
    meter.registerJudgment("miss");
    meter.reset();
    expect(meter.value).toBe(50);
  });
});
