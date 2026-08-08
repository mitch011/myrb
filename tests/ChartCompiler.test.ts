import { describe, expect, it } from "vitest";
import { absoluteBeat, compileNote, compileNotes } from "@chart/ChartCompiler";
import type { MusicalNote } from "@chart/MusicalTime";

const tempo = { bpm: 120, beatsPerMeasure: 4, offsetSeconds: 0 };

describe("ChartCompiler", () => {
  it("compiles measure 0 beat 0 to the offset time", () => {
    const note: MusicalNote = { measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "normal" };
    expect(compileNote(note, tempo).timestamp).toBeCloseTo(0);
  });

  it("compiles one quarter-note beat at 120 BPM to 0.5 seconds", () => {
    const note: MusicalNote = { measure: 0, beat: 1, subdivision: "quarter", tick: 0, lane: 0, type: "normal" };
    expect(compileNote(note, tempo).timestamp).toBeCloseTo(0.5);
  });

  it("compiles a full measure (4 beats) at 120 BPM to 2 seconds", () => {
    const note: MusicalNote = { measure: 1, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "normal" };
    expect(compileNote(note, tempo).timestamp).toBeCloseTo(2.0);
  });

  it("places a sixteenth-note tick a quarter of a beat later", () => {
    const note: MusicalNote = { measure: 0, beat: 0, subdivision: "sixteenth", tick: 1, lane: 0, type: "normal" };
    // 1/4 of a beat at 120bpm (0.5s/beat) = 0.125s
    expect(compileNote(note, tempo).timestamp).toBeCloseTo(0.125);
  });

  it("places a triplet tick a third of a beat later", () => {
    const note: MusicalNote = {
      measure: 0,
      beat: 0,
      subdivision: "eighth-triplet",
      tick: 1,
      lane: 0,
      type: "normal",
    };
    expect(compileNote(note, tempo).timestamp).toBeCloseTo(0.5 / 3);
  });

  it("applies the song offset to every note", () => {
    const offsetTempo = { ...tempo, offsetSeconds: 1.5 };
    const note: MusicalNote = { measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "normal" };
    expect(compileNote(note, offsetTempo).timestamp).toBeCloseTo(1.5);
  });

  it("computes absolute beat across measures", () => {
    const note: MusicalNote = { measure: 2, beat: 3, subdivision: "quarter", tick: 0, lane: 0, type: "normal" };
    expect(absoluteBeat(note, tempo)).toBe(2 * 4 + 3);
  });

  it("sorts compiled notes by timestamp regardless of authoring order", () => {
    const notes: MusicalNote[] = [
      { measure: 1, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "normal" },
      { measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 1, type: "normal" },
    ];
    const compiled = compileNotes(notes, tempo);
    expect(compiled[0].lane).toBe(1);
    expect(compiled[1].lane).toBe(0);
  });

  it("produces two notes at the same timestamp for a chord", () => {
    const notes: MusicalNote[] = [
      { measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 0, type: "normal" },
      { measure: 0, beat: 0, subdivision: "quarter", tick: 0, lane: 2, type: "normal" },
    ];
    const compiled = compileNotes(notes, tempo);
    expect(compiled[0].timestamp).toBeCloseTo(compiled[1].timestamp);
  });
});
