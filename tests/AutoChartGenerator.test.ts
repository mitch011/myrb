import { describe, expect, it } from "vitest";
import { generateAutoChart } from "@chart/AutoChartGenerator";
import { DRUM_LANES } from "@chart/LaneConfiguration";
import type { Onset } from "@audio/OnsetDetector";

function onset(time: number, band: Onset["band"], energy = 0.5): Onset {
  return { time, band, energy };
}

describe("generateAutoChart", () => {
  it("maps low/mid/high bands to lanes 0/1/2", () => {
    // A louder padding onset keeps these three safely out of the "top 10%"
    // special bucket, which would otherwise reroute them to the accent lane.
    const onsets = [onset(0, "low", 0.1), onset(1, "mid", 0.1), onset(2, "high", 0.1), onset(10, "low", 0.9)];
    const { hard } = generateAutoChart(onsets, DRUM_LANES);
    const nonSpecialLanes = hard.filter((n) => n.type !== "special").map((n) => n.lane);
    expect(nonSpecialLanes).toEqual([0, 1, 2]);
  });

  it("keeps essentially every onset on Hard", () => {
    const onsets = Array.from({ length: 30 }, (_, i) => onset(i * 0.1, "low", 0.3));
    const { hard } = generateAutoChart(onsets, DRUM_LANES);
    expect(hard).toHaveLength(30);
  });

  it("marks the loudest onsets as special, routed to the accent lane", () => {
    const onsets = [
      ...Array.from({ length: 9 }, (_, i) => onset(i * 0.2, "low", 0.2)),
      onset(2.0, "low", 1.0),
    ];
    const { hard } = generateAutoChart(onsets, DRUM_LANES);
    const loudest = hard.find((n) => n.timestamp === 2.0)!;
    expect(loudest.type).toBe("special");
    expect(loudest.lane).toBe(DRUM_LANES.laneCount - 1);
  });

  it("thins Medium so a single lane never fires faster than the gap, but allows cross-lane chords", () => {
    const onsets = [
      onset(0, "low", 0.1),
      onset(0.05, "low", 0.1), // too close to the previous low hit — should be dropped
      onset(0.05, "high", 0.1), // same instant, different lane — should survive (a chord)
      onset(0.3, "low", 0.1),
      onset(10, "low", 0.9), // padding, see comment above
    ];
    const { medium } = generateAutoChart(onsets, DRUM_LANES);
    const lowHits = medium.filter((n) => n.lane === 0);
    const highHits = medium.filter((n) => n.lane === 2);
    expect(lowHits.map((n) => n.timestamp)).toEqual([0, 0.3]);
    expect(highHits.map((n) => n.timestamp)).toEqual([0.05]);
  });

  it("collapses Easy to two lanes with no simultaneous notes", () => {
    const onsets = [onset(0, "low"), onset(0.02, "high"), onset(1.0, "mid")];
    const { easy } = generateAutoChart(onsets, DRUM_LANES);
    const lanesUsed = new Set(easy.map((n) => n.lane));
    for (const lane of lanesUsed) expect(lane).toBeLessThanOrEqual(1);

    for (let i = 1; i < easy.length; i++) {
      expect(easy[i].timestamp - easy[i - 1].timestamp).toBeGreaterThanOrEqual(0.35);
    }
  });

  it("produces fewer or equal notes going Hard -> Medium -> Easy", () => {
    const onsets = Array.from({ length: 40 }, (_, i) => onset(i * 0.12, i % 2 === 0 ? "low" : "high", 0.4));
    const { easy, medium, hard } = generateAutoChart(onsets, DRUM_LANES);
    expect(hard.length).toBeGreaterThanOrEqual(medium.length);
    expect(medium.length).toBeGreaterThanOrEqual(easy.length);
  });
});
