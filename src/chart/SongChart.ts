import type { Difficulty } from "@core/Difficulty";
import type { MusicalNote } from "./MusicalTime";
import type { Note } from "./Note";
import { compileNotes, type TempoConfig } from "./ChartCompiler";

/** Raw, human-authored chart: musical time, not seconds. This is the on-disk JSON shape. */
export interface SongChart {
  song: string;
  bpm: number;
  beatsPerMeasure: number;
  offset: number;
  easy: MusicalNote[];
  medium: MusicalNote[];
  hard: MusicalNote[];
}

/** Playback-ready chart: every difficulty compiled to absolute timestamps. */
export interface CompiledChart {
  song: string;
  bpm: number;
  easy: Note[];
  medium: Note[];
  hard: Note[];
}

export function compileSongChart(chart: SongChart): CompiledChart {
  const tempo: TempoConfig = {
    bpm: chart.bpm,
    beatsPerMeasure: chart.beatsPerMeasure,
    offsetSeconds: chart.offset,
  };
  return {
    song: chart.song,
    bpm: chart.bpm,
    easy: compileNotes(chart.easy, tempo),
    medium: compileNotes(chart.medium, tempo),
    hard: compileNotes(chart.hard, tempo),
  };
}

export function getDifficultyNotes(chart: CompiledChart, difficulty: Difficulty): Note[] {
  return chart[difficulty];
}
