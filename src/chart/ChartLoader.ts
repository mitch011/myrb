import type { LaneConfiguration } from "./LaneConfiguration";
import type { CompiledChart, SongChart } from "./SongChart";
import { compileSongChart } from "./SongChart";
import { ChartValidationError, validateCompiledChart, validateSongChart } from "./ChartValidator";

function assertSongChartShape(json: unknown): asserts json is SongChart {
  if (typeof json !== "object" || json === null) {
    throw new ChartValidationError("Chart JSON must be an object.");
  }
  const record = json as Record<string, unknown>;
  const requiredArrayFields = ["easy", "medium", "hard"] as const;
  for (const field of requiredArrayFields) {
    if (!Array.isArray(record[field])) {
      throw new ChartValidationError(`Chart is missing a "${field}" note array.`);
    }
  }
  if (typeof record.bpm !== "number") {
    throw new ChartValidationError('Chart is missing a numeric "bpm".');
  }
  if (typeof record.beatsPerMeasure !== "number") {
    throw new ChartValidationError('Chart is missing a numeric "beatsPerMeasure".');
  }
  if (typeof record.offset !== "number") {
    throw new ChartValidationError('Chart is missing a numeric "offset".');
  }
}

/**
 * Loads and validates a chart authored as JSON (musical time), then compiles
 * it to absolute playback timestamps. This is the only supported chart
 * source today; loadMIDI is a documented seam for a future importer so the
 * gameplay engine never has to change when MIDI support lands.
 */
export function loadJSON(json: unknown, laneConfig: LaneConfiguration): CompiledChart {
  assertSongChartShape(json);
  validateSongChart(json, laneConfig);
  const compiled = compileSongChart(json);
  validateCompiledChart(compiled);
  return compiled;
}

export function loadMIDI(_data: ArrayBuffer, _laneConfig: LaneConfiguration): CompiledChart {
  throw new Error("MIDI chart import is not implemented yet. Use loadJSON with an authored chart.");
}
