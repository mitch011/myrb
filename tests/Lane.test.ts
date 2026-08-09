import { describe, expect, it } from "vitest";
import { DEFAULT_PERSPECTIVE, laneAtProgress, laneBoundaryX } from "@gameplay/Lane";

const WIDTH = 400;
const LANE_COUNT = 4;

describe("laneAtProgress", () => {
  it("is wider at the top (progress 0) than at the hit line (progress 1)", () => {
    const top = laneAtProgress(WIDTH, LANE_COUNT, 0, 0);
    const bottom = laneAtProgress(WIDTH, LANE_COUNT, 0, 1);
    expect(top.width).toBeGreaterThan(bottom.width);
  });

  it("keeps lanes centered — outer margins match on both sides", () => {
    const first = laneAtProgress(WIDTH, LANE_COUNT, 0, 0.5);
    const last = laneAtProgress(WIDTH, LANE_COUNT, LANE_COUNT - 1, 0.5);
    const leftMargin = first.x;
    const rightMargin = WIDTH - (last.x + last.width);
    expect(leftMargin).toBeCloseTo(rightMargin, 5);
  });

  it("tiles lanes with no gaps or overlaps at a given progress", () => {
    for (let progress = 0; progress <= 1; progress += 0.25) {
      let expectedX = laneAtProgress(WIDTH, LANE_COUNT, 0, progress).x;
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const geometry = laneAtProgress(WIDTH, LANE_COUNT, lane, progress);
        expect(geometry.x).toBeCloseTo(expectedX, 5);
        expectedX += geometry.width;
      }
    }
  });

  it("matches the configured top/bottom width fractions", () => {
    const top = laneAtProgress(WIDTH, LANE_COUNT, 0, 0);
    const bottom = laneAtProgress(WIDTH, LANE_COUNT, 0, 1);
    expect(top.width * LANE_COUNT).toBeCloseTo(WIDTH * DEFAULT_PERSPECTIVE.topWidthFraction, 5);
    expect(bottom.width * LANE_COUNT).toBeCloseTo(WIDTH * DEFAULT_PERSPECTIVE.bottomWidthFraction, 5);
  });
});

describe("laneBoundaryX", () => {
  it("boundary 0 equals the leftmost lane's left edge", () => {
    const lane0 = laneAtProgress(WIDTH, LANE_COUNT, 0, 0.3);
    expect(laneBoundaryX(WIDTH, LANE_COUNT, 0, 0.3)).toBeCloseTo(lane0.x, 5);
  });

  it("boundary laneCount equals the rightmost lane's right edge", () => {
    const lastLane = laneAtProgress(WIDTH, LANE_COUNT, LANE_COUNT - 1, 0.7);
    expect(laneBoundaryX(WIDTH, LANE_COUNT, LANE_COUNT, 0.7)).toBeCloseTo(lastLane.x + lastLane.width, 5);
  });
});
