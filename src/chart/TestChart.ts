import type { MusicalNote, SubdivisionName } from "./MusicalTime";
import type { NoteType } from "./NoteType";
import type { SongChart } from "./SongChart";

function mk(
  measure: number,
  beat: number,
  subdivision: SubdivisionName,
  tick: number,
  lane: number,
  type: NoteType = "normal"
): MusicalNote {
  return { measure, beat, subdivision, tick, lane, type };
}

/**
 * Phase 1 development chart — no real song yet. Patterns are hand-tuned per
 * difficulty (not derived from each other) to exercise chords, syncopation,
 * and density the way a real chart eventually will.
 */
export function generateTestChart(measureCount = 16): SongChart {
  const easy: MusicalNote[] = [];
  const medium: MusicalNote[] = [];
  const hard: MusicalNote[] = [];

  for (let m = 0; m < measureCount; m++) {
    // EASY — basic rock beat: kick on 1 & 3, snare on 2 & 4.
    easy.push(mk(m, 0, "quarter", 0, 0));
    easy.push(mk(m, 1, "quarter", 0, 1));
    easy.push(mk(m, 2, "quarter", 0, 0));
    easy.push(mk(m, 3, "quarter", 0, 1));
    if (m % 4 === 3) {
      easy.push(mk(m, 3, "quarter", 0, 3, "special"));
    }

    // MEDIUM — base beat plus eighth-note hats and occasional chords.
    medium.push(mk(m, 0, "quarter", 0, 0));
    medium.push(mk(m, 1, "quarter", 0, 1));
    medium.push(mk(m, 2, "quarter", 0, 0));
    medium.push(mk(m, 3, "quarter", 0, 1));
    for (let beat = 0; beat < 4; beat++) {
      medium.push(mk(m, beat, "eighth", 0, 2));
      medium.push(mk(m, beat, "eighth", 1, 2));
    }
    if (m % 2 === 1) {
      medium.push(mk(m, 2, "eighth", 1, 3));
    }
    if (m % 4 === 3) {
      medium.push(mk(m, 3, "quarter", 0, 3, "special"));
      medium.push(mk(m, 3, "quarter", 0, 0, "special"));
    }

    // HARD — denser backbeat hats, ghost kicks, and a triplet fill every 4 bars.
    hard.push(mk(m, 0, "quarter", 0, 0));
    hard.push(mk(m, 1, "quarter", 0, 1));
    hard.push(mk(m, 1, "sixteenth", 2, 0));
    hard.push(mk(m, 2, "quarter", 0, 0));
    hard.push(mk(m, 2, "eighth", 1, 3));
    hard.push(mk(m, 3, "quarter", 0, 1));
    for (const beat of [1, 3]) {
      for (let tick = 0; tick < 4; tick++) {
        hard.push(mk(m, beat, "sixteenth", tick, 2));
      }
    }
    if (m % 4 === 3) {
      hard.push(mk(m, 3, "sixteenth-triplet", 0, 3, "special"));
      hard.push(mk(m, 3, "sixteenth-triplet", 1, 1));
      hard.push(mk(m, 3, "sixteenth-triplet", 2, 0));
      hard.push(mk(m, 3, "sixteenth-triplet", 3, 3));
      hard.push(mk(m, 3, "sixteenth-triplet", 4, 1));
      hard.push(mk(m, 3, "sixteenth-triplet", 5, 0, "special"));
    }
  }

  return {
    song: "Test Pattern",
    bpm: 120,
    beatsPerMeasure: 4,
    offset: 1.5,
    easy,
    medium,
    hard,
  };
}
