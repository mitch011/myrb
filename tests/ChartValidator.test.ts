import { describe, expect, it } from "vitest";
import { loadJSON } from "@chart/ChartLoader";
import { DRUM_LANES } from "@chart/LaneConfiguration";
import type { SongChart } from "@chart/SongChart";

function baseChart(overrides: Partial<SongChart> = {}): SongChart {
  return {
    song: "Test",
    bpm: 120,
    beatsPerMeasure: 4,
    offset: 0,
    easy: [],
    medium: [],
    hard: [],
    ...overrides,
  };
}

describe("loadJSON validation", () => {
  it("accepts a well-formed chart", () => {
    const chart = baseChart({
      easy: [{ measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "normal" }],
    });
    expect(() => loadJSON(chart, DRUM_LANES)).not.toThrow();
  });

  it("rejects a chart missing required arrays", () => {
    const chart = { song: "Test", bpm: 120, beatsPerMeasure: 4, offset: 0 };
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/missing/i);
  });

  it("rejects a note referencing an out-of-range lane", () => {
    const chart = baseChart({
      easy: [{ measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 5, type: "normal" }],
    });
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/lane 5/i);
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/Valid lanes are 0-3/);
  });

  it("rejects a note with a beat outside the time signature", () => {
    const chart = baseChart({
      easy: [{ measure: 0, beat: 4, subdivision: "quarter", tick: 0, lane: 0, type: "normal" }],
    });
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/beat 4/i);
  });

  it("rejects a note with a tick outside its subdivision's resolution", () => {
    const chart = baseChart({
      easy: [{ measure: 0, beat: 0, subdivision: "sixteenth", tick: 9, lane: 0, type: "normal" }],
    });
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/tick 9/i);
  });

  it("rejects an unknown note type", () => {
    const chart = baseChart({
      easy: [{ measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "explosion" as never }],
    });
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/unknown type/i);
  });

  it("rejects a negative BPM", () => {
    const chart = baseChart({ bpm: -10 });
    expect(() => loadJSON(chart, DRUM_LANES)).toThrow(/bpm/i);
  });
});
