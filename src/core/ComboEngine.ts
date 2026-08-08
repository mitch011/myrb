export interface ComboConfiguration {
  /** Combo counts at which the multiplier steps up (index 0 -> 2x, index 1 -> 3x, ...). */
  multiplierThresholds: number[];
  maxMultiplier: number;
}

export const DEFAULT_COMBO_CONFIG: ComboConfiguration = {
  multiplierThresholds: [10, 20, 30],
  maxMultiplier: 4,
};

export class ComboEngine {
  private currentCombo = 0;
  private best = 0;

  constructor(private readonly config: ComboConfiguration = DEFAULT_COMBO_CONFIG) {}

  get combo(): number {
    return this.currentCombo;
  }

  get maxCombo(): number {
    return this.best;
  }

  get multiplier(): number {
    let multiplier = 1;
    for (const threshold of this.config.multiplierThresholds) {
      if (this.currentCombo >= threshold) multiplier++;
    }
    return Math.min(multiplier, this.config.maxMultiplier);
  }

  registerHit(): void {
    this.currentCombo++;
    if (this.currentCombo > this.best) this.best = this.currentCombo;
  }

  registerMiss(): void {
    this.currentCombo = 0;
  }

  reset(): void {
    this.currentCombo = 0;
    this.best = 0;
  }
}
