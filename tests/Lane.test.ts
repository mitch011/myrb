import { describe, expect, it } from "vitest";
import { computeLanes } from "@gameplay/Lane";

const WIDTH = 400;
const LANE_COUNT = 4;

describe("computeLanes", () => {
  it("divides the canvas into equal-width lanes", () => {
    const lanes = computeLanes(WIDTH, LANE_COUNT);
    expect(lanes).toHaveLength(LANE_COUNT);
    for (const lane of lanes) expect(lane.width).toBeCloseTo(WIDTH / LANE_COUNT, 5);
  });

  it("tiles lanes with no gaps or overlaps, spanning the full width", () => {
    const lanes = computeLanes(WIDTH, LANE_COUNT);
    expect(lanes[0].x).toBeCloseTo(0, 5);
    for (let i = 1; i < lanes.length; i++) {
      expect(lanes[i].x).toBeCloseTo(lanes[i - 1].x + lanes[i - 1].width, 5);
    }
    const last = lanes[lanes.length - 1];
    expect(last.x + last.width).toBeCloseTo(WIDTH, 5);
  });

  it("centers each lane's centerX within its own bounds", () => {
    const lanes = computeLanes(WIDTH, LANE_COUNT);
    for (const lane of lanes) {
      expect(lane.centerX).toBeCloseTo(lane.x + lane.width / 2, 5);
    }
  });
});
