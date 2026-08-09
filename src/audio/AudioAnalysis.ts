import { detectOnsets, type OnsetDetectionResult } from "./OnsetDetector";

export function toMonoSamples(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      mono[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return mono;
}

export function analyzeAudioBuffer(buffer: AudioBuffer): OnsetDetectionResult {
  return detectOnsets(toMonoSamples(buffer), buffer.sampleRate);
}
