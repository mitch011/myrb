import { describe, expect, it } from "vitest";
import { ScoreEngine } from "@core/ScoreEngine";
import { DEFAULT_SCORE_CONFIG } from "@core/ScoreConfiguration";

describe("ScoreEngine", () => {
  it("awards base points at 1x multiplier", () => {
    const engine = new ScoreEngine();
    engine.applyJudgment("perfect", 1);
    expect(engine.score).toBe(DEFAULT_SCORE_CONFIG.perfectPoints);
  });

  it("multiplies points by the combo multiplier", () => {
    const engine = new ScoreEngine();
    const gained = engine.applyJudgment("perfect", 4);
    expect(gained).toBe(DEFAULT_SCORE_CONFIG.perfectPoints * 4);
    expect(engine.score).toBe(DEFAULT_SCORE_CONFIG.perfectPoints * 4);
  });

  it("accumulates across multiple judgments", () => {
    const engine = new ScoreEngine();
    engine.applyJudgment("perfect", 1);
    engine.applyJudgment("great", 1);
    engine.applyJudgment("good", 1);
    expect(engine.score).toBe(
      DEFAULT_SCORE_CONFIG.perfectPoints +
        DEFAULT_SCORE_CONFIG.greatPoints +
        DEFAULT_SCORE_CONFIG.goodPoints
    );
  });

  it("awards nothing for a miss", () => {
    const engine = new ScoreEngine();
    engine.applyJudgment("miss", 4);
    expect(engine.score).toBe(0);
  });

  it("resets to zero", () => {
    const engine = new ScoreEngine();
    engine.applyJudgment("perfect", 1);
    engine.reset();
    expect(engine.score).toBe(0);
  });
});
