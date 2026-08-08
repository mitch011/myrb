import type { AudioAsset } from "./AudioAsset";

/**
 * Owns the single shared AudioContext. iOS requires the context to be
 * created or resumed from within a user-gesture handler (a button tap), so
 * callers must invoke `resume()` from one before any audio can play.
 */
export class AudioEngine {
  readonly context: AudioContext;

  constructor() {
    this.context = new AudioContext();
  }

  async resume(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async loadFromURL(url: string): Promise<AudioAsset> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio asset "${url}": ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(arrayBuffer);
    return { url, buffer };
  }
}
