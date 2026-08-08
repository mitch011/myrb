/**
 * Authoritative song clock. Gameplay must always read `currentTime` from an
 * implementation of this interface rather than frame count or wall-clock
 * timers — Phase 2 swaps PerformanceClock for one backed by AVFoundation-
 * equivalent audio playback time without the gameplay code changing.
 */
export interface SongClock {
  readonly currentTime: number;
  readonly isPlaying: boolean;
  start(): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  restart(): void;
}

/**
 * Phase 1 clock: derived from performance.now(), not audio. There is no song
 * to sync to yet, but the interface is what the rest of the engine depends
 * on, so swapping in an audio-backed clock later is a one-file change.
 */
export class PerformanceClock implements SongClock {
  private startTimeMs = 0;
  private elapsedBeforePauseMs = 0;
  private playing = false;

  get currentTime(): number {
    if (!this.playing) return this.elapsedBeforePauseMs / 1000;
    return (this.elapsedBeforePauseMs + (performance.now() - this.startTimeMs)) / 1000;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  start(): void {
    this.elapsedBeforePauseMs = 0;
    this.startTimeMs = performance.now();
    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    this.elapsedBeforePauseMs += performance.now() - this.startTimeMs;
    this.playing = false;
  }

  resume(): void {
    if (this.playing) return;
    this.startTimeMs = performance.now();
    this.playing = true;
  }

  seek(seconds: number): void {
    this.elapsedBeforePauseMs = seconds * 1000;
    this.startTimeMs = performance.now();
  }

  restart(): void {
    this.start();
  }
}
