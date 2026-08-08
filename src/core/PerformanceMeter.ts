import type { Judgment } from "./TimingConfiguration";

export interface PerformanceMeterConfiguration {
  startingHealth: number;
  maxHealth: number;
  failThreshold: number;
  gain: Record<Judgment, number>;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceMeterConfiguration = {
  startingHealth: 50,
  maxHealth: 100,
  failThreshold: 0,
  gain: {
    perfect: 3,
    great: 2,
    good: 1,
    miss: -6,
  },
};

/** Tracks the player's on-stage health; misses drain it, hits restore it. */
export class PerformanceMeter {
  private health: number;

  constructor(
    private readonly config: PerformanceMeterConfiguration = DEFAULT_PERFORMANCE_CONFIG,
    private readonly noFailMode = false
  ) {
    this.health = config.startingHealth;
  }

  get value(): number {
    return this.health;
  }

  get fraction(): number {
    return this.health / this.config.maxHealth;
  }

  get hasFailed(): boolean {
    return !this.noFailMode && this.health <= this.config.failThreshold;
  }

  registerJudgment(judgment: Judgment): void {
    const delta = this.config.gain[judgment];
    this.health = Math.max(0, Math.min(this.config.maxHealth, this.health + delta));
  }

  reset(): void {
    this.health = this.config.startingHealth;
  }
}
