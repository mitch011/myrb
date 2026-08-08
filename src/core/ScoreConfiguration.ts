export interface ScoreConfiguration {
  perfectPoints: number;
  greatPoints: number;
  goodPoints: number;
  missPoints: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfiguration = {
  perfectPoints: 100,
  greatPoints: 80,
  goodPoints: 50,
  missPoints: 0,
};
