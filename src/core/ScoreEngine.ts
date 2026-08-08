import type { Judgment } from "./TimingConfiguration";
import type { ScoreConfiguration } from "./ScoreConfiguration";
import { DEFAULT_SCORE_CONFIG } from "./ScoreConfiguration";

export class ScoreEngine {
  private total = 0;

  constructor(private readonly config: ScoreConfiguration = DEFAULT_SCORE_CONFIG) {}

  get score(): number {
    return this.total;
  }

  /** Applies a judgment at the given combo multiplier and returns the points gained. */
  applyJudgment(judgment: Judgment, multiplier: number): number {
    const base = this.basePoints(judgment);
    const gained = base * multiplier;
    this.total += gained;
    return gained;
  }

  reset(): void {
    this.total = 0;
  }

  private basePoints(judgment: Judgment): number {
    switch (judgment) {
      case "perfect":
        return this.config.perfectPoints;
      case "great":
        return this.config.greatPoints;
      case "good":
        return this.config.goodPoints;
      case "miss":
        return this.config.missPoints;
    }
  }
}
