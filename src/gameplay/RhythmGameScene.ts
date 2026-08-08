import type { GameSession, JudgmentEvent } from "@core/GameSession";
import type { LaneConfiguration } from "@chart/LaneConfiguration";
import { computeLanes, type LaneGeometry } from "./Lane";
import { computeHighwayGeometry, type HighwayGeometry } from "./HitZone";
import { DEFAULT_LEAD_TIME_SECONDS, drawNote, noteProgress, noteY } from "./NoteRenderer";
import { DrumPad } from "./DrumPad";
import { FeedbackRenderer } from "./FeedbackRenderer";
import { ParticleEffects } from "./ParticleEffects";
import { TouchInputManager } from "@input/TouchInputManager";

const PAD_GAP = 10;
const PAD_MARGIN = 14;

export class RhythmGameScene {
  private readonly ctx: CanvasRenderingContext2D;
  private lanes: LaneGeometry[] = [];
  private highway: HighwayGeometry;
  private pads: DrumPad[] = [];
  private readonly feedback = new FeedbackRenderer();
  private readonly particles = new ParticleEffects();
  private input: TouchInputManager;
  private lastFrameMs = 0;
  private rafId = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly session: GameSession,
    private readonly laneConfig: LaneConfiguration
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context is not available.");
    this.ctx = context;
    this.highway = computeHighwayGeometry(canvas.clientHeight);

    this.resize();
    window.addEventListener("resize", this.resize);

    this.input = new TouchInputManager(canvas, this.pads, this.handlePadDown, this.handlePadUp);
    this.session.onJudgment(this.handleJudgment);
  }

  start(): void {
    this.session.start();
    this.lastFrameMs = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resize);
    this.input.destroy();
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.lanes = computeLanes(width, this.laneConfig.laneCount);
    this.highway = computeHighwayGeometry(height);
    this.layoutPads(width, height);
  };

  private layoutPads(canvasWidth: number, canvasHeight: number): void {
    const padAreaHeight = canvasHeight - this.highway.padAreaTopY;
    const totalGap = PAD_GAP * (this.laneConfig.laneCount - 1) + PAD_MARGIN * 2;
    const padWidth = (canvasWidth - totalGap) / this.laneConfig.laneCount;
    const padHeight = padAreaHeight - PAD_MARGIN;

    for (let lane = 0; lane < this.laneConfig.laneCount; lane++) {
      const x = PAD_MARGIN + lane * (padWidth + PAD_GAP);
      const y = this.highway.padAreaTopY + PAD_MARGIN / 2;
      const rect = { x, y, width: padWidth, height: padHeight };

      const existing = this.pads[lane];
      if (existing) {
        existing.rect = rect;
      } else {
        this.pads[lane] = new DrumPad(
          lane,
          this.laneConfig.laneNames[lane],
          this.laneConfig.laneColors[lane],
          rect
        );
      }
    }
  }

  private handlePadDown = (lane: number): void => {
    this.pads[lane]?.press(performance.now());
    this.session.handleHit(lane);
  };

  private handlePadUp = (lane: number): void => {
    this.pads[lane]?.release();
  };

  private handleJudgment = (event: JudgmentEvent): void => {
    const lane = this.lanes[event.lane];
    if (!lane) return;
    const nowMs = performance.now();
    this.feedback.spawn(event.judgment, lane.centerX, this.highway.hitZoneY, nowMs);
    if (event.judgment !== "miss") {
      this.particles.burst(
        lane.centerX,
        this.highway.hitZoneY,
        this.laneConfig.laneColors[event.lane],
        nowMs
      );
    }
  };

  private loop = (nowMs: number): void => {
    const dtSeconds = this.lastFrameMs ? (nowMs - this.lastFrameMs) / 1000 : 0;
    this.lastFrameMs = nowMs;

    this.session.update();
    this.feedback.update(nowMs);
    this.particles.update(nowMs, dtSeconds);
    this.render(nowMs);

    if (this.session.state === "playing" || this.session.state === "countdown") {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  private render(nowMs: number): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);
    this.drawStage(width, height);
    this.drawHighway(width);
    this.drawNotes();
    for (const pad of this.pads) pad.draw(ctx, nowMs);
    this.drawHud(width);
    this.feedback.draw(ctx, nowMs);
    this.particles.draw(ctx, nowMs);
  }

  private drawStage(width: number, height: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a0a16");
    gradient.addColorStop(0.6, "#12121f");
    gradient.addColorStop(1, "#050508");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawHighway(width: number): void {
    const ctx = this.ctx;
    const { topY, hitZoneY } = this.highway;

    for (const lane of this.lanes) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = this.laneConfig.laneColors[lane.index];
      ctx.fillRect(lane.x, topY, lane.width, hitZoneY - topY);
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(lane.x, topY);
      ctx.lineTo(lane.x, hitZoneY);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(width, topY);
    ctx.lineTo(width, hitZoneY);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, hitZoneY);
    ctx.lineTo(width, hitZoneY);
    ctx.stroke();
    ctx.restore();
  }

  private drawNotes(): void {
    const currentTime = this.session.currentTime;
    for (const note of this.session.notes) {
      if (note.hit || note.missed) continue;
      const progress = noteProgress(note, currentTime, DEFAULT_LEAD_TIME_SECONDS);
      if (progress < -0.05 || progress > 1.05) continue;

      const lane = this.lanes[note.lane];
      const y = noteY(progress, this.highway);
      drawNote(this.ctx, lane, y, this.laneConfig.laneColors[note.lane], note.type === "special");
    }
  }

  private drawHud(width: number): void {
    const ctx = this.ctx;
    const score = this.session.scoreEngine.score;
    const combo = this.session.comboEngine.combo;
    const multiplier = this.session.comboEngine.multiplier;

    ctx.save();
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(score).padStart(6, "0"), 16, 12);

    ctx.textAlign = "right";
    ctx.fillStyle = multiplier >= 4 ? "#ffd60a" : "#ffffff";
    ctx.fillText(`${multiplier}X`, width - 16, 12);

    if (combo > 0) {
      ctx.textAlign = "left";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`COMBO x${combo}`, 16, 44);
    }
    ctx.restore();
  }
}
