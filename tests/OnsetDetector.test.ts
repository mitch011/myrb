import { describe, expect, it } from "vitest";
import { detectOnsets, type Onset } from "@audio/OnsetDetector";

const SAMPLE_RATE = 44100;

function addBurst(
  samples: Float32Array,
  startTime: number,
  freqHz: number,
  amplitude: number,
  decayRate: number
): void {
  const startSample = Math.floor(startTime * SAMPLE_RATE);
  const durationSamples = Math.floor(0.08 * SAMPLE_RATE);
  for (let i = 0; i < durationSamples && startSample + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * decayRate);
    samples[startSample + i] += amplitude * envelope * Math.sin(2 * Math.PI * freqHz * t);
  }
}

function nearestOnset(onsets: Onset[], time: number): Onset | undefined {
  return onsets
    .filter((onset) => Math.abs(onset.time - time) < 0.05)
    .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0];
}

describe("detectOnsets", () => {
  it("returns nothing for near-silent audio", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    const result = detectOnsets(samples, SAMPLE_RATE);
    expect(result.onsets).toHaveLength(0);
  });

  it("detects low-frequency kick bursts and classifies them as 'low'", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    const kickTimes = [0.1, 0.6, 1.1, 1.6];
    for (const time of kickTimes) addBurst(samples, time, 80, 0.9, 25);

    const { onsets } = detectOnsets(samples, SAMPLE_RATE);
    expect(onsets.length).toBeGreaterThanOrEqual(kickTimes.length - 1);

    for (const time of kickTimes) {
      const match = nearestOnset(onsets, time);
      expect(match, `expected an onset near t=${time}`).toBeDefined();
      expect(match!.band).toBe("low");
    }
  });

  it("detects high-frequency hihat bursts and classifies them as 'high'", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    const hihatTimes = [0.1, 0.6, 1.1, 1.6];
    for (const time of hihatTimes) addBurst(samples, time, 7000, 0.7, 60);

    const { onsets } = detectOnsets(samples, SAMPLE_RATE);
    for (const time of hihatTimes) {
      const match = nearestOnset(onsets, time);
      expect(match, `expected an onset near t=${time}`).toBeDefined();
      expect(match!.band).toBe("high");
    }
  });

  it("distinguishes alternating kick and hihat hits by band", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    addBurst(samples, 0.1, 80, 0.9, 25);
    addBurst(samples, 0.35, 7000, 0.7, 60);
    addBurst(samples, 0.6, 80, 0.9, 25);
    addBurst(samples, 0.85, 7000, 0.7, 60);

    const { onsets } = detectOnsets(samples, SAMPLE_RATE);
    expect(nearestOnset(onsets, 0.1)?.band).toBe("low");
    expect(nearestOnset(onsets, 0.35)?.band).toBe("high");
    expect(nearestOnset(onsets, 0.6)?.band).toBe("low");
    expect(nearestOnset(onsets, 0.85)?.band).toBe("high");
  });

  it("normalizes energy so the loudest onset is 1", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    addBurst(samples, 0.1, 80, 0.3, 25);
    addBurst(samples, 0.6, 80, 0.9, 25);

    const { onsets } = detectOnsets(samples, SAMPLE_RATE);
    const maxEnergy = Math.max(...onsets.map((o) => o.energy));
    expect(maxEnergy).toBeCloseTo(1, 5);
  });

  it("still classifies a hihat correctly over a loud sustained low-frequency backdrop", () => {
    // Regression test for a real failure: a loud sustained rhythm-guitar
    // wall (modeled here as a continuous low-frequency drone) used to make
    // absolute low-band energy dominate every onset for the rest of the
    // song, collapsing every lane to "low". Flux-based classification
    // should still see the hihat's high-frequency jump on top of it.
    const samples = new Float32Array(SAMPLE_RATE * 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] += 0.5 * Math.sin((2 * Math.PI * 200 * i) / SAMPLE_RATE);
    }
    const hihatTimes = [1.0, 1.3, 1.6];
    for (const time of hihatTimes) addBurst(samples, time, 7000, 0.6, 60);

    const { onsets } = detectOnsets(samples, SAMPLE_RATE);
    for (const time of hihatTimes) {
      const match = nearestOnset(onsets, time);
      expect(match, `expected an onset near t=${time}`).toBeDefined();
      expect(match!.band).toBe("high");
    }
  });

  it("estimates a plausible BPM from a regular beat", () => {
    const samples = new Float32Array(SAMPLE_RATE * 2);
    for (const time of [0.1, 0.6, 1.1, 1.6]) addBurst(samples, time, 80, 0.9, 25);

    const { estimatedBpm } = detectOnsets(samples, SAMPLE_RATE);
    expect(estimatedBpm).toBeGreaterThanOrEqual(60);
    expect(estimatedBpm).toBeLessThanOrEqual(200);
  });
});
