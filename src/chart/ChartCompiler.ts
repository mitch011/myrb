import type { MusicalNote } from "./MusicalTime";
import { SUBDIVISION_RESOLUTION } from "./MusicalTime";
import type { Note } from "./Note";

export interface TempoConfig {
  bpm: number;
  beatsPerMeasure: number;
  /** Seconds added to every compiled timestamp — aligns chart authoring to actual audio start. */
  offsetSeconds: number;
}

export function absoluteBeat(note: MusicalNote, tempo: TempoConfig): number {
  const resolution = SUBDIVISION_RESOLUTION[note.subdivision];
  return note.measure * tempo.beatsPerMeasure + note.beat + note.tick / resolution;
}

export function compileNote(note: MusicalNote, tempo: TempoConfig): Note {
  const secondsPerBeat = 60 / tempo.bpm;
  const timestamp = tempo.offsetSeconds + absoluteBeat(note, tempo) * secondsPerBeat;
  const duration = (note.durationBeats ?? 0) * secondsPerBeat;
  return {
    id: `${note.measure}.${note.beat}.${note.subdivision}.${note.tick}.${note.lane}`,
    timestamp,
    lane: note.lane,
    duration,
    type: note.type,
  };
}

export function compileNotes(notes: MusicalNote[], tempo: TempoConfig): Note[] {
  return notes
    .map((note) => compileNote(note, tempo))
    .sort((a, b) => a.timestamp - b.timestamp);
}
