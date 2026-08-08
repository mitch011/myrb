/**
 * Low-level playback control for a single decoded AudioBuffer. Web Audio
 * source nodes are one-shot (a stopped node can't be restarted), so pause
 * tears down the node and remembers the offset; resume creates a fresh one.
 *
 * `play()` accepts an absolute AudioContext time to start at, which is what
 * makes sample-accurate, drift-free countdown scheduling possible: schedule
 * the node to start N seconds in the future, and elapsedSeconds will read
 * negative until that exact instant arrives.
 */
export class SongPlayer {
  private sourceNode: AudioBufferSourceNode | null = null;
  private startedAtContextTime = 0;
  private startOffsetSeconds = 0;
  private playing = false;

  constructor(readonly context: AudioContext, private readonly buffer: AudioBuffer) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  get elapsedSeconds(): number {
    if (!this.playing) return this.startOffsetSeconds;
    return this.startOffsetSeconds + (this.context.currentTime - this.startedAtContextTime);
  }

  play(fromSeconds = 0, whenContextTime?: number): void {
    this.stopCurrentSource();

    const startAt = whenContextTime ?? this.context.currentTime;
    this.sourceNode = this.context.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.connect(this.context.destination);
    this.sourceNode.start(startAt, fromSeconds);

    this.startOffsetSeconds = fromSeconds;
    this.startedAtContextTime = startAt;
    this.playing = true;
  }

  pause(): void {
    if (!this.playing) return;
    this.startOffsetSeconds = this.elapsedSeconds;
    this.stopCurrentSource();
    this.playing = false;
  }

  resume(): void {
    if (this.playing) return;
    this.play(this.startOffsetSeconds);
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing;
    this.stopCurrentSource();
    this.startOffsetSeconds = seconds;
    this.playing = false;
    if (wasPlaying) this.play(seconds);
  }

  stop(): void {
    this.stopCurrentSource();
    this.startOffsetSeconds = 0;
    this.playing = false;
  }

  private stopCurrentSource(): void {
    if (!this.sourceNode) return;
    this.sourceNode.onended = null;
    try {
      this.sourceNode.stop();
    } catch {
      // Already stopped/never started — nothing to do.
    }
    this.sourceNode.disconnect();
    this.sourceNode = null;
  }
}
