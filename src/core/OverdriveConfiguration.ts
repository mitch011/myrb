export interface OverdriveConfiguration {
  /** Meter units gained per special note successfully hit. */
  chargePerSpecialHit: number;
  /** Meter value (0-100) at which Overdrive becomes activatable. */
  activationThreshold: number;
  /** Meter units drained per second while active. */
  drainPerSecond: number;
  /** Multiplier applied on top of the combo multiplier while active. */
  scoreMultiplierBonus: number;
}

export const DEFAULT_OVERDRIVE_CONFIG: OverdriveConfiguration = {
  chargePerSpecialHit: 25,
  activationThreshold: 100,
  drainPerSecond: 12.5, // fully drains over 8 seconds
  scoreMultiplierBonus: 2,
};
