export type FrequencyBand = "low" | "mid" | "high";

export interface Onset {
  time: number; // seconds
  /** Relative loudness of this onset, normalized 0-1 against the loudest onset in the signal. */
  energy: number;
  /** Dominant frequency content at the onset — a heuristic stand-in for kick/snare/hihat. */
  band: FrequencyBand;
}

export interface OnsetDetectionResult {
  onsets: Onset[];
  estimatedBpm: number;
}

const HOP_SIZE = 512;
const LOW_CUTOFF_HZ = 150;
const HIGH_CUTOFF_HZ = 3000;
const ADAPTIVE_WINDOW_FRAMES = 40;
const THRESHOLD_K = 1.5;
const MIN_THRESHOLD_FLOOR = 0.01;
const MIN_GAP_SECONDS = 0.08;
const BAND_DOMINANCE_RATIO = 1.3;
const MIN_BPM = 60;
const MAX_BPM = 200;
const BPM_BIN_WIDTH = 2;

/**
 * Onset (note-attack) detection from a mono PCM signal, using a spectral-
 * flux-style approach: energy is tracked in low/full/high bands via simple
 * one-pole filters, and a peak is accepted as an onset when it exceeds a
 * locally-adaptive threshold. This is a heuristic, not real drum
 * transcription — there's no source separation — but it gives usable
 * timing, relative loudness, and a rough low/mid/high classification for
 * any arbitrary audio file, which is enough to drive lane assignment.
 */
export function detectOnsets(samples: Float32Array, sampleRate: number): OnsetDetectionResult {
  if (samples.length < HOP_SIZE * 4) {
    return { onsets: [], estimatedBpm: 120 };
  }

  const lowSamples = onePoleLowPass(samples, sampleRate, LOW_CUTOFF_HZ);
  const highSamples = onePoleHighPass(samples, sampleRate, HIGH_CUTOFF_HZ);

  const frameCount = Math.floor(samples.length / HOP_SIZE);
  const fullEnergy = new Float32Array(frameCount);
  const lowEnergy = new Float32Array(frameCount);
  const highEnergy = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    const start = i * HOP_SIZE;
    fullEnergy[i] = rms(samples, start, HOP_SIZE);
    lowEnergy[i] = rms(lowSamples, start, HOP_SIZE);
    highEnergy[i] = rms(highSamples, start, HOP_SIZE);
  }

  const onsetStrength = new Float32Array(frameCount);
  for (let i = 1; i < frameCount; i++) {
    onsetStrength[i] = Math.max(0, fullEnergy[i] - fullEnergy[i - 1]);
  }

  const hopSeconds = HOP_SIZE / sampleRate;
  const onsets: Onset[] = [];
  let lastOnsetTime = -Infinity;

  for (let i = 1; i < frameCount - 1; i++) {
    const windowStart = Math.max(0, i - ADAPTIVE_WINDOW_FRAMES);
    const { mean, std } = meanAndStd(onsetStrength, windowStart, i);
    const threshold = Math.max(mean + THRESHOLD_K * std, MIN_THRESHOLD_FLOOR);

    const isLocalMax = onsetStrength[i] >= onsetStrength[i + 1] && onsetStrength[i] > onsetStrength[i - 1];
    const time = i * hopSeconds;

    if (onsetStrength[i] > threshold && isLocalMax && time - lastOnsetTime >= MIN_GAP_SECONDS) {
      lastOnsetTime = time;
      const lowFlux = Math.max(0, lowEnergy[i] - lowEnergy[i - 1]);
      const highFlux = Math.max(0, highEnergy[i] - highEnergy[i - 1]);
      onsets.push({
        time,
        energy: fullEnergy[i],
        band: classifyBand(lowFlux, highFlux, onsetStrength[i]),
      });
    }
  }

  normalizeEnergy(onsets);
  return { onsets, estimatedBpm: estimateBpm(onsets) };
}

function rms(data: Float32Array, start: number, length: number): number {
  const end = Math.min(start + length, data.length);
  let sumSquares = 0;
  for (let i = start; i < end; i++) sumSquares += data[i] * data[i];
  const count = end - start;
  return count > 0 ? Math.sqrt(sumSquares / count) : 0;
}

function meanAndStd(data: Float32Array, start: number, end: number): { mean: number; std: number } {
  const count = end - start;
  if (count <= 0) return { mean: 0, std: 0 };

  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i];
  const mean = sum / count;

  let variance = 0;
  for (let i = start; i < end; i++) variance += (data[i] - mean) ** 2;
  return { mean, std: Math.sqrt(variance / count) };
}

/**
 * Classifies by how much each band's energy jumped AT this transient
 * (flux), not by absolute band level. A loud sustained instrument (e.g. a
 * distorted rhythm guitar wall) raises absolute low/mid energy for the rest
 * of the song without necessarily contributing a fresh jump at any given
 * instant, so flux-based comparison stays discriminative where absolute-
 * level comparison would collapse everything into whichever band the
 * backdrop happens to dominate.
 */
function classifyBand(lowFlux: number, highFlux: number, fullFlux: number): FrequencyBand {
  const epsilon = 1e-9;
  const lowRatio = lowFlux / (fullFlux + epsilon);
  const highRatio = highFlux / (fullFlux + epsilon);
  if (lowRatio > highRatio * BAND_DOMINANCE_RATIO) return "low";
  if (highRatio > lowRatio * BAND_DOMINANCE_RATIO) return "high";
  return "mid";
}

function normalizeEnergy(onsets: Onset[]): void {
  const maxEnergy = onsets.reduce((max, onset) => Math.max(max, onset.energy), 0);
  if (maxEnergy <= 0) return;
  for (const onset of onsets) onset.energy /= maxEnergy;
}

function estimateBpm(onsets: Onset[]): number {
  if (onsets.length < 2) return 120;

  const minIoi = 60 / MAX_BPM;
  const maxIoi = 60 / MIN_BPM;
  const bins = new Map<number, number>();

  for (let i = 1; i < onsets.length; i++) {
    const ioi = onsets[i].time - onsets[i - 1].time;
    if (ioi < minIoi || ioi > maxIoi) continue;
    const bpm = 60 / ioi;
    const bin = Math.round(bpm / BPM_BIN_WIDTH) * BPM_BIN_WIDTH;
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  if (bins.size === 0) return 120;

  let bestBin = 120;
  let bestCount = -1;
  for (const [bin, count] of bins) {
    if (count > bestCount) {
      bestCount = count;
      bestBin = bin;
    }
  }
  return bestBin;
}

function onePoleLowPass(samples: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);

  const output = new Float32Array(samples.length);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    previous = previous + alpha * (samples[i] - previous);
    output[i] = previous;
  }
  return output;
}

function onePoleHighPass(samples: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = rc / (rc + dt);

  const output = new Float32Array(samples.length);
  let previousOutput = 0;
  let previousInput = samples[0] ?? 0;
  for (let i = 0; i < samples.length; i++) {
    previousOutput = alpha * (previousOutput + samples[i] - previousInput);
    previousInput = samples[i];
    output[i] = previousOutput;
  }
  return output;
}
