import type { SongClock } from "@core/GameClock";
import { SongPlayer } from "./SongPlayer";

/**
 * Adapts a SongPlayer to the SongClock interface the rest of the engine
 * depends on. This is the one file that changes when swapping the Phase 1
 * PerformanceClock for real audio — GameSession and the renderer never know
 * the difference.
 */
export class AudioSyncManager implements SongClock {
  constructor(private readonly player: SongPlayer, private readonly countdownLeadSeconds = 0) {}

  get currentTime(): number {
    return this.player.elapsedSeconds;
  }

  get isPlaying(): boolean {
    return this.player.isPlaying;
  }

  start(): void {
    const startAt = this.player.context.currentTime + this.countdownLeadSeconds;
    this.player.play(0, startAt);
  }

  pause(): void {
    this.player.pause();
  }

  resume(): void {
    this.player.resume();
  }

  seek(seconds: number): void {
    this.player.seek(seconds);
  }

  restart(): void {
    this.start();
  }
}
