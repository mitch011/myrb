export interface LaneGeometry {
  index: number;
  x: number;
  width: number;
  centerX: number;
}

/**
 * The highway narrows toward the hit zone rather than running in flat
 * parallel columns — a cheap affine trapezoid that reads as perspective,
 * matching the converging note-highway look of the era's rhythm games.
 */
export interface HighwayPerspective {
  topWidthFraction: number;
  bottomWidthFraction: number;
}

export const DEFAULT_PERSPECTIVE: HighwayPerspective = {
  topWidthFraction: 0.96,
  bottomWidthFraction: 0.6,
};

function widthFractionAt(progress: number, perspective: HighwayPerspective): number {
  return perspective.topWidthFraction + (perspective.bottomWidthFraction - perspective.topWidthFraction) * progress;
}

/** Geometry for a single lane at a given vertical progress (0 = top of the highway, 1 = the hit line). */
export function laneAtProgress(
  canvasWidth: number,
  laneCount: number,
  laneIndex: number,
  progress: number,
  perspective: HighwayPerspective = DEFAULT_PERSPECTIVE
): LaneGeometry {
  const totalWidth = canvasWidth * widthFractionAt(progress, perspective);
  const marginLeft = (canvasWidth - totalWidth) / 2;
  const laneWidth = totalWidth / laneCount;
  const x = marginLeft + laneIndex * laneWidth;
  return { index: laneIndex, x, width: laneWidth, centerX: x + laneWidth / 2 };
}

/** X position of the boundary line to the left of `boundaryIndex` (0..laneCount) at a given progress. */
export function laneBoundaryX(
  canvasWidth: number,
  laneCount: number,
  boundaryIndex: number,
  progress: number,
  perspective: HighwayPerspective = DEFAULT_PERSPECTIVE
): number {
  const totalWidth = canvasWidth * widthFractionAt(progress, perspective);
  const marginLeft = (canvasWidth - totalWidth) / 2;
  const laneWidth = totalWidth / laneCount;
  return marginLeft + boundaryIndex * laneWidth;
}

export function computeLanesAtProgress(
  canvasWidth: number,
  laneCount: number,
  progress: number,
  perspective: HighwayPerspective = DEFAULT_PERSPECTIVE
): LaneGeometry[] {
  return Array.from({ length: laneCount }, (_, index) =>
    laneAtProgress(canvasWidth, laneCount, index, progress, perspective)
  );
}

/** Lane geometry at the hit zone (progress = 1) — used for hit-zone-anchored UI like feedback/particle spawn points. */
export function computeLanes(
  canvasWidth: number,
  laneCount: number,
  perspective: HighwayPerspective = DEFAULT_PERSPECTIVE
): LaneGeometry[] {
  return computeLanesAtProgress(canvasWidth, laneCount, 1, perspective);
}
