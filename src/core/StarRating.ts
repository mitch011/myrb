export interface StarThresholds {
  /** Ascending accuracy fractions (0-1) required for 2, 3, 4, and 5 stars. Below the first is 1 star. */
  thresholds: [number, number, number, number];
}

export const DEFAULT_STAR_THRESHOLDS: StarThresholds = {
  thresholds: [0.5, 0.7, 0.8, 0.9],
};

export function starsForAccuracy(
  accuracyFraction: number,
  config: StarThresholds = DEFAULT_STAR_THRESHOLDS
): number {
  let stars = 1;
  for (const threshold of config.thresholds) {
    if (accuracyFraction >= threshold) stars++;
  }
  return stars;
}
