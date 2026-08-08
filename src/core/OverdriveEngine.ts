import type { OverdriveConfiguration } from "./OverdriveConfiguration";
import { DEFAULT_OVERDRIVE_CONFIG } from "./OverdriveConfiguration";

export class OverdriveEngine {
  private meterValue = 0;
  private activeFlag = false;

  constructor(private readonly config: OverdriveConfiguration = DEFAULT_OVERDRIVE_CONFIG) {}

  /** 0-100. */
  get meter(): number {
    return this.meterValue;
  }

  get meterFraction(): number {
    return this.meterValue / this.config.activationThreshold;
  }

  get isReady(): boolean {
    return this.meterValue >= this.config.activationThreshold && !this.activeFlag;
  }

  get isActive(): boolean {
    return this.activeFlag;
  }

  /** Multiply this into the combo multiplier when scoring; 1 when not active. */
  get scoreMultiplierBonus(): number {
    return this.activeFlag ? this.config.scoreMultiplierBonus : 1;
  }

  chargeFromSpecialHit(): void {
    if (this.activeFlag) return;
    this.meterValue = Math.min(
      this.config.activationThreshold,
      this.meterValue + this.config.chargePerSpecialHit
    );
  }

  /** Returns true if activation succeeded (meter was full and not already active). */
  activate(): boolean {
    if (!this.isReady) return false;
    this.activeFlag = true;
    return true;
  }

  update(dtSeconds: number): void {
    if (!this.activeFlag) return;
    this.meterValue = Math.max(0, this.meterValue - this.config.drainPerSecond * dtSeconds);
    if (this.meterValue <= 0) {
      this.activeFlag = false;
    }
  }

  reset(): void {
    this.meterValue = 0;
    this.activeFlag = false;
  }
}
