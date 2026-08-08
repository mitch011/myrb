export interface TimingWindowsMs {
  perfect: number;
  great: number;
  good: number;
}

// Anything beyond `good` (in either direction) is a miss.
export const DEFAULT_TIMING_WINDOWS: TimingWindowsMs = {
  perfect: 50,
  great: 90,
  good: 130,
};

export type Judgment = "perfect" | "great" | "good" | "miss";
