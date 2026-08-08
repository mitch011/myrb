import type { Note } from "./Note";

/** A compiled Note plus the mutable state a play session tracks against it. */
export interface NoteRuntime extends Note {
  hit: boolean;
  missed: boolean;
}

export function toRuntimeNotes(notes: Note[]): NoteRuntime[] {
  return notes.map((note) => ({ ...note, hit: false, missed: false }));
}
