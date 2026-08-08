export interface LaneConfiguration {
  laneCount: number;
  laneNames: string[];
  laneColors: string[];
}

// Four touchscreen drum pads — not a simulated four-piece kit. The player
// taps colored pads as notes descend, matching the 2009 iPhone interaction
// model rather than a console five-lane layout.
export const DRUM_LANES: LaneConfiguration = {
  laneCount: 4,
  laneNames: ["RED", "YELLOW", "BLUE", "GREEN"],
  laneColors: ["#e5383b", "#ffd60a", "#4cc9f0", "#57cc99"],
};

export function isValidLane(lane: number, config: LaneConfiguration): boolean {
  return Number.isInteger(lane) && lane >= 0 && lane < config.laneCount;
}
