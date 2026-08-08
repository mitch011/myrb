import type { NoteType } from "./NoteType";

/**
 * A compiled, playback-ready note. Produced by ChartCompiler from a
 * MusicalNote — this is what the timing engine and renderer consume.
 */
export interface Note {
  id: string;
  timestamp: number; // seconds, authoritative playback time
  lane: number;
  duration: number; // seconds; 0 for taps
  type: NoteType;
}
