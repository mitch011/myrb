export interface HighwayGeometry {
  topY: number;
  hitZoneY: number;
  padAreaTopY: number;
  canvasHeight: number;
}

// Highway occupies the middle band of the screen; pads live below the hit
// line, HUD lives above the highway.
export function computeHighwayGeometry(canvasHeight: number): HighwayGeometry {
  const topY = canvasHeight * 0.16;
  const hitZoneY = canvasHeight * 0.78;
  const padAreaTopY = hitZoneY;
  return { topY, hitZoneY, padAreaTopY, canvasHeight };
}
