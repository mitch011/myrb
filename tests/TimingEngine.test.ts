import { describe, expect, it } from "vitest";
import { classifyDelta, maxJudgeableWindowSeconds } from "@core/TimingEngine";
import { DEFAULT_TIMING_WINDOWS } from "@core/TimingConfiguration";

describe("classifyDelta", () => {
  it("classifies a dead-on hit as perfect", () => {
    expect(classifyDelta(0, DEFAULT_TIMING_WINDOWS)).toBe("perfect");
  });

  it("classifies exactly at the perfect boundary as perfect", () => {
    expect(classifyDelta(0.05, DEFAULT_TIMING_WINDOWS)).toBe("perfect");
  });

  it("classifies just past the perfect boundary as great", () => {
    expect(classifyDelta(0.051, DEFAULT_TIMING_WINDOWS)).toBe("great");
  });

  it("classifies just past the great boundary as good", () => {
    expect(classifyDelta(0.091, DEFAULT_TIMING_WINDOWS)).toBe("good");
  });

  it("returns null (ignore) past the good boundary", () => {
    expect(classifyDelta(0.131, DEFAULT_TIMING_WINDOWS)).toBeNull();
  });

  it("is symmetric for early and late hits", () => {
    expect(classifyDelta(-0.04, DEFAULT_TIMING_WINDOWS)).toBe("perfect");
    expect(classifyDelta(0.04, DEFAULT_TIMING_WINDOWS)).toBe("perfect");
  });
});

describe("maxJudgeableWindowSeconds", () => {
  it("matches the good window converted to seconds", () => {
    expect(maxJudgeableWindowSeconds(DEFAULT_TIMING_WINDOWS)).toBeCloseTo(0.13);
  });
});
