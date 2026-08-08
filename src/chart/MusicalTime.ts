import type { NoteType } from "./NoteType";

// Friendly rhythmic grid names. The number is the number of grid slots per
// beat, so a note's rhythmic offset within its beat is `tick / resolution`.
export type SubdivisionName =
  | "quarter"
  | "eighth"
  | "sixteenth"
  | "eighth-triplet"
  | "sixteenth-triplet";

export const SUBDIVISION_RESOLUTION: Record<SubdivisionName, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
  "eighth-triplet": 3,
  "sixteenth-triplet": 6,
};

/**
 * A note authored in musical time rather than absolute seconds: "measure 42,
 * beat 3, on the 16th-note grid, slot 2" instead of a raw timestamp. This is
 * the format charts are written in; ChartCompiler turns it into playback
 * timestamps using the song's tempo.
 */
export interface MusicalNote {
  measure: number; // 0-based
  beat: number; // 0-based within the measure
  subdivision: SubdivisionName;
  tick: number; // 0-based slot within the subdivision grid (0..resolution-1)
  lane: number;
  type: NoteType;
  /** For held notes: length of the hold, in beats. Omit/0 for taps. */
  durationBeats?: number;
}

export function musicalNoteResolution(note: MusicalNote): number {
  return SUBDIVISION_RESOLUTION[note.subdivision];
}
