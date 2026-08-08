import type { Difficulty } from "@core/Difficulty";
import { DIFFICULTIES } from "@core/Difficulty";
import type { LaneConfiguration } from "./LaneConfiguration";
import { isValidLane } from "./LaneConfiguration";
import { SUBDIVISION_RESOLUTION } from "./MusicalTime";
import type { SongChart } from "./SongChart";
import type { CompiledChart } from "./SongChart";

const VALID_NOTE_TYPES = new Set(["normal", "special", "held"]);
const VALID_SUBDIVISIONS = new Set(Object.keys(SUBDIVISION_RESOLUTION));

export class ChartValidationError extends Error {
  constructor(message: string) {
    super(`Chart error: ${message}`);
    this.name = "ChartValidationError";
  }
}

export function validateSongChart(chart: SongChart, laneConfig: LaneConfiguration): void {
  if (!(chart.bpm > 0)) {
    throw new ChartValidationError(`Invalid BPM ${chart.bpm}. BPM must be greater than 0.`);
  }
  if (!Number.isInteger(chart.beatsPerMeasure) || chart.beatsPerMeasure <= 0) {
    throw new ChartValidationError(
      `Invalid beatsPerMeasure ${chart.beatsPerMeasure}. Must be a positive integer.`
    );
  }

  for (const difficulty of DIFFICULTIES) {
    validateDifficultyNotes(chart, difficulty, laneConfig);
  }
}

function validateDifficultyNotes(
  chart: SongChart,
  difficulty: Difficulty,
  laneConfig: LaneConfiguration
): void {
  const notes = chart[difficulty];
  notes.forEach((note, index) => {
    const label = `#${index} (${difficulty})`;

    if (!Number.isInteger(note.measure) || note.measure < 0) {
      throw new ChartValidationError(`Note ${label} has invalid measure ${note.measure}.`);
    }
    if (!Number.isInteger(note.beat) || note.beat < 0 || note.beat >= chart.beatsPerMeasure) {
      throw new ChartValidationError(
        `Note ${label} has beat ${note.beat}, outside 0-${chart.beatsPerMeasure - 1}.`
      );
    }
    if (!VALID_SUBDIVISIONS.has(note.subdivision)) {
      throw new ChartValidationError(
        `Note ${label} has unknown subdivision "${note.subdivision}".`
      );
    }
    const resolution = SUBDIVISION_RESOLUTION[note.subdivision];
    if (!Number.isInteger(note.tick) || note.tick < 0 || note.tick >= resolution) {
      throw new ChartValidationError(
        `Note ${label} has tick ${note.tick}, outside 0-${resolution - 1} for "${note.subdivision}".`
      );
    }
    if (!isValidLane(note.lane, laneConfig)) {
      throw new ChartValidationError(
        `Note ${label} references lane ${note.lane}. Valid lanes are 0-${laneConfig.laneCount - 1}.`
      );
    }
    if (!VALID_NOTE_TYPES.has(note.type)) {
      throw new ChartValidationError(`Note ${label} has unknown type "${note.type}".`);
    }
  });
}

export function validateCompiledChart(chart: CompiledChart, songDuration?: number): void {
  for (const difficulty of DIFFICULTIES) {
    const notes = chart[difficulty];
    let previousTimestamp = -Infinity;
    notes.forEach((note, index) => {
      const label = `#${index} (${difficulty})`;
      if (note.timestamp < 0) {
        throw new ChartValidationError(`Note ${label} has negative timestamp ${note.timestamp}.`);
      }
      if (note.timestamp < previousTimestamp) {
        throw new ChartValidationError(`Note ${label} is out of order after compilation.`);
      }
      if (songDuration !== undefined && note.timestamp > songDuration) {
        throw new ChartValidationError(
          `Note ${label} at ${note.timestamp}s falls after song duration ${songDuration}s.`
        );
      }
      previousTimestamp = note.timestamp;
    });
  }
}
