import type { NoteRuntime } from "@chart/NoteRuntime";
import { toRuntimeNotes } from "@chart/NoteRuntime";
import type { Note } from "@chart/Note";
import type { LaneConfiguration } from "@chart/LaneConfiguration";
import type { SongClock } from "./GameClock";
import type { Judgment, TimingWindowsMs } from "./TimingConfiguration";
import { DEFAULT_TIMING_WINDOWS } from "./TimingConfiguration";
import { classifyDelta, maxJudgeableWindowSeconds } from "./TimingEngine";
import { ScoreEngine } from "./ScoreEngine";
import { ComboEngine } from "./ComboEngine";
import { OverdriveEngine } from "./OverdriveEngine";
import { PerformanceMeter } from "./PerformanceMeter";
import { starsForAccuracy } from "./StarRating";
import type { GameState } from "./GameState";
import type { PlayStats } from "@models/Score";

export interface JudgmentEvent {
  judgment: Judgment;
  lane: number;
  note: NoteRuntime;
  deltaSeconds: number;
  pointsGained: number;
  combo: number;
  multiplier: number;
}

export type JudgmentListener = (event: JudgmentEvent) => void;

export interface GameSessionOptions {
  timingWindows?: TimingWindowsMs;
  noFailMode?: boolean;
  /** Seconds added to (now - note.timestamp) before judging — see Settings.calibrationOffsetSeconds. */
  calibrationOffsetSeconds?: number;
}

/**
 * Orchestrates a single play-through: owns the authoritative clock, the
 * runtime note state, and the score/combo engines. The renderer and input
 * layer only ever talk to this, never to the clock or engines directly.
 */
export class GameSession {
  readonly notes: NoteRuntime[];
  readonly scoreEngine = new ScoreEngine();
  readonly comboEngine = new ComboEngine();
  readonly overdriveEngine = new OverdriveEngine();
  readonly performanceMeter: PerformanceMeter;
  state: GameState = "countdown";

  private judgmentListeners: JudgmentListener[] = [];
  private readonly timingWindows: TimingWindowsMs;
  private readonly calibrationOffsetSeconds: number;
  private readonly maxWindowSeconds: number;
  private perfectCount = 0;
  private greatCount = 0;
  private goodCount = 0;
  private missCount = 0;

  constructor(
    notes: Note[],
    private readonly clock: SongClock,
    private readonly laneConfig: LaneConfiguration,
    options: GameSessionOptions = {}
  ) {
    const {
      timingWindows = DEFAULT_TIMING_WINDOWS,
      noFailMode = false,
      calibrationOffsetSeconds = 0,
    } = options;

    this.notes = toRuntimeNotes(notes);
    this.timingWindows = timingWindows;
    this.calibrationOffsetSeconds = calibrationOffsetSeconds;
    this.maxWindowSeconds = maxJudgeableWindowSeconds(timingWindows);
    this.performanceMeter = new PerformanceMeter(undefined, noFailMode);
  }

  get currentTime(): number {
    return this.clock.currentTime;
  }

  get laneCount(): number {
    return this.laneConfig.laneCount;
  }

  /** Combo multiplier with the Overdrive bonus folded in — what scoring actually uses. */
  get effectiveMultiplier(): number {
    return this.comboEngine.multiplier * this.overdriveEngine.scoreMultiplierBonus;
  }

  /** Returns true if the player successfully activated Overdrive. */
  activateOverdrive(): boolean {
    if (this.state !== "playing") return false;
    return this.overdriveEngine.activate();
  }

  onJudgment(listener: JudgmentListener): void {
    this.judgmentListeners.push(listener);
  }

  start(): void {
    this.state = "playing";
    this.clock.start();
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.clock.pause();
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.clock.resume();
  }

  restart(): void {
    for (const note of this.notes) {
      note.hit = false;
      note.missed = false;
    }
    this.scoreEngine.reset();
    this.comboEngine.reset();
    this.overdriveEngine.reset();
    this.performanceMeter.reset();
    this.perfectCount = 0;
    this.greatCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.state = "playing";
    this.clock.restart();
  }

  /** Call once per frame with the frame's elapsed seconds. Sweeps past-window notes into misses and drains Overdrive. */
  update(dtSeconds: number): void {
    if (this.state !== "playing") return;
    this.overdriveEngine.update(dtSeconds);

    const now = this.clock.currentTime;
    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      if (now - note.timestamp > this.maxWindowSeconds) {
        note.missed = true;
        this.comboEngine.registerMiss();
        this.emitJudgment("miss", note, now - note.timestamp);
      }
    }

    if (this.performanceMeter.hasFailed) {
      this.state = "failed";
      this.clock.pause();
    } else if (this.isChartComplete()) {
      this.state = "finished";
      this.clock.pause();
    }
  }

  getResult(): PlayStats {
    const totalNotes = this.notes.length;
    const successfulHits = this.perfectCount + this.greatCount + this.goodCount;
    const accuracyFraction = totalNotes > 0 ? successfulHits / totalNotes : 0;
    return {
      score: this.scoreEngine.score,
      maxCombo: this.comboEngine.maxCombo,
      perfectCount: this.perfectCount,
      greatCount: this.greatCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
      totalNotes,
      accuracyFraction,
      stars: starsForAccuracy(accuracyFraction),
      failed: this.performanceMeter.hasFailed,
    };
  }

  isChartComplete(): boolean {
    return this.notes.every((note) => note.hit || note.missed);
  }

  /** Player tapped a lane. Finds the earliest judgeable note in that lane and scores it. */
  handleHit(lane: number): JudgmentEvent | null {
    if (this.state !== "playing") return null;
    const now = this.clock.currentTime;

    // Notes are compiled in timestamp order, so the first eligible one in this
    // lane is necessarily the earliest.
    const candidate = this.notes.find(
      (note) => note.lane === lane && !note.hit && !note.missed
    );
    if (!candidate) return null;

    const delta = now - candidate.timestamp + this.calibrationOffsetSeconds;
    const judgment = classifyDelta(delta, this.timingWindows);
    if (judgment === null) return null;

    candidate.hit = true;
    this.comboEngine.registerHit();
    if (candidate.type === "special") {
      this.overdriveEngine.chargeFromSpecialHit();
    }
    const pointsGained = this.scoreEngine.applyJudgment(judgment, this.effectiveMultiplier);

    return this.emitJudgment(judgment, candidate, delta, pointsGained);
  }

  private emitJudgment(
    judgment: Judgment,
    note: NoteRuntime,
    deltaSeconds: number,
    pointsGained = 0
  ): JudgmentEvent {
    this.performanceMeter.registerJudgment(judgment);
    switch (judgment) {
      case "perfect":
        this.perfectCount++;
        break;
      case "great":
        this.greatCount++;
        break;
      case "good":
        this.goodCount++;
        break;
      case "miss":
        this.missCount++;
        break;
    }

    const event: JudgmentEvent = {
      judgment,
      lane: note.lane,
      note,
      deltaSeconds,
      pointsGained,
      combo: this.comboEngine.combo,
      multiplier: this.effectiveMultiplier,
    };
    for (const listener of this.judgmentListeners) listener(event);
    return event;
  }
}
