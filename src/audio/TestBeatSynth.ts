export interface TestBeatConfig {
  bpm: number;
  beatsPerMeasure: number;
  offsetSeconds: number;
  measureCount: number;
}

const TAIL_SECONDS = 1.5;

/**
 * Renders a metronome click track entirely offline — no external audio file
 * needed. Clicks land at the exact same offset + beat*secondsPerBeat times
 * ChartCompiler uses for notes, so this is a genuine "the clock comes from
 * real audio playback" test rather than a stand-in.
 */
export async function synthesizeTestBeat(
  context: AudioContext,
  config: TestBeatConfig
): Promise<AudioBuffer> {
  const secondsPerBeat = 60 / config.bpm;
  const totalBeats = config.beatsPerMeasure * config.measureCount;
  const durationSeconds = config.offsetSeconds + totalBeats * secondsPerBeat + TAIL_SECONDS;

  const offlineContext = new OfflineAudioContext(
    1,
    Math.ceil(durationSeconds * context.sampleRate),
    context.sampleRate
  );

  for (let beat = 0; beat < totalBeats; beat++) {
    const time = config.offsetSeconds + beat * secondsPerBeat;
    const isDownbeat = beat % config.beatsPerMeasure === 0;
    scheduleClick(offlineContext, time, isDownbeat);
  }

  return offlineContext.startRendering();
}

function scheduleClick(context: OfflineAudioContext, time: number, accent: boolean): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = accent ? 1400 : 900;

  gain.gain.setValueAtTime(accent ? 0.35 : 0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.06);
}
