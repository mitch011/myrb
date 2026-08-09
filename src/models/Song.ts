import type { CompiledChart } from "@chart/SongChart";
import type { TestBeatConfig } from "@audio/TestBeatSynth";

export interface LoadedSong {
  id: string;
  title: string;
  artist: string;
  chart: CompiledChart;
  /** null for the built-in synthesized test track; present for any uploaded song. */
  audioBuffer: AudioBuffer | null;
  estimatedBpm: number;
  /** True when the chart came from onset detection rather than hand authoring. */
  autoCharted: boolean;
  /** Only set when audioBuffer is null — how to synthesize the stand-in click track. */
  testBeatConfig?: TestBeatConfig;
}
