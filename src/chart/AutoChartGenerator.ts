import type { Onset } from "@audio/OnsetDetector";
import type { Note } from "./Note";
import type { LaneConfiguration } from "./LaneConfiguration";

export interface AutoChartResult {
  easy: Note[];
  medium: Note[];
  hard: Note[];
}

// The loudest ~10% of onsets become Overdrive specials, rather than every
// difficulty independently deciding what counts as an accent.
const SPECIAL_ENERGY_PERCENTILE = 0.9;
// Onsets below this fraction of the song's loudest onset are dropped
// entirely, on every difficulty (including Hard) — a weak, marginal blip is
// harder to feel and predict than a clear hit, so it's better excluded than
// included-and-unreliable. Keeps the resulting chart "clean" rather than
// reacting to every faint fluctuation in the mix.
const MIN_CONFIDENT_ENERGY_FRACTION = 0.18;
// Medium thins each lane independently, so an occasional cross-lane chord
// (e.g. kick+hihat landing together) can still survive; Easy thins globally
// so nothing simultaneous survives at all.
const MEDIUM_MIN_GAP_SECONDS = 0.15;
const EASY_MIN_GAP_SECONDS = 0.35;

/**
 * Turns detected onsets from arbitrary audio into a 3-difficulty chart.
 * Hard keeps essentially every confident onset; Medium and Easy are
 * gap-thinned subsets (not literally "every Nth note") so the patterns stay
 * musically plausible rather than mechanically decimated.
 */
export function generateAutoChart(onsets: Onset[], laneConfig: LaneConfiguration): AutoChartResult {
  const confident = onsets.filter((onset) => onset.energy >= MIN_CONFIDENT_ENERGY_FRACTION);
  const sorted = confident.sort((a, b) => a.time - b.time);
  const specialThreshold = percentile(
    sorted.map((onset) => onset.energy),
    SPECIAL_ENERGY_PERCENTILE
  );

  const hard: Note[] = sorted.map((onset, index) => {
    const isSpecial = onset.energy >= specialThreshold;
    return {
      id: `auto-${index}`,
      timestamp: onset.time,
      lane: laneForOnset(onset, isSpecial, laneConfig.laneCount),
      duration: 0,
      type: isSpecial ? "special" : "normal",
    };
  });

  const medium = thinPerLane(hard, MEDIUM_MIN_GAP_SECONDS);
  const easy = thinGlobal(hard, EASY_MIN_GAP_SECONDS).map((note) => ({
    ...note,
    lane: simplifyLaneForEasy(note.lane),
  }));

  return { easy, medium, hard };
}

function laneForOnset(onset: Onset, isSpecial: boolean, laneCount: number): number {
  if (isSpecial && laneCount >= 4) return laneCount - 1; // dedicated accent/crash lane
  if (laneCount < 3) return onset.band === "low" ? 0 : laneCount - 1;

  switch (onset.band) {
    case "low":
      return 0;
    case "high":
      return 2;
    case "mid":
      return 1;
  }
}

function simplifyLaneForEasy(lane: number): number {
  return lane === 0 ? 0 : 1;
}

function thinPerLane(notes: Note[], minGapSeconds: number): Note[] {
  const lastKeptByLane = new Map<number, number>();
  const kept: Note[] = [];
  for (const note of notes) {
    const last = lastKeptByLane.get(note.lane) ?? -Infinity;
    if (note.timestamp - last >= minGapSeconds) {
      kept.push(note);
      lastKeptByLane.set(note.lane, note.timestamp);
    }
  }
  return kept;
}

function thinGlobal(notes: Note[], minGapSeconds: number): Note[] {
  let lastKept = -Infinity;
  const kept: Note[] = [];
  for (const note of notes) {
    if (note.timestamp - lastKept >= minGapSeconds) {
      kept.push(note);
      lastKept = note.timestamp;
    }
  }
  return kept;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[index];
}
