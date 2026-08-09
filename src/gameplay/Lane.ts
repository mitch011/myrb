export interface LaneGeometry {
  index: number;
  x: number;
  width: number;
  centerX: number;
}

export function computeLanes(canvasWidth: number, laneCount: number): LaneGeometry[] {
  const width = canvasWidth / laneCount;
  return Array.from({ length: laneCount }, (_, index) => ({
    index,
    x: index * width,
    width,
    centerX: index * width + width / 2,
  }));
}
