import type { GameSession, JudgmentEvent } from "@core/GameSession";
import type { PlayStats } from "@models/Score";
import type { LaneConfiguration } from "@chart/LaneConfiguration";
import { computeLanes, type LaneGeometry } from "./Lane";
import { computeHighwayGeometry, type HighwayGeometry } from "./HitZone";
import { DEFAULT_LEAD_TIME_SECONDS, drawNote, noteProgress, noteY } from "./NoteRenderer";
import { DrumPad, rectContains, type Rect } from "./DrumPad";
import { FeedbackRenderer } from "./FeedbackRenderer";
import { ParticleEffects } from "./ParticleEffects";
import { countdownLabel } from "./Countdown";
import { TouchInputManager } from "@input/TouchInputManager";
import { MotionManager } from "@input/MotionManager";
import { HAPTIC_PATTERNS, vibrate } from "@input/Haptics";

const PAD_GAP = 10;
const PAD_MARGIN = 14;
const OVERDRIVE_BUTTON_WIDTH_FRACTION = 0.5;
const OVERDRIVE_BUTTON_HEIGHT_FRACTION = 0.08;

export class RhythmGameScene {
  private readonly ctx: CanvasRenderingContext2D;
  private lanes: LaneGeometry[] = [];
  private highway: HighwayGeometry;
  private pads: DrumPad[] = [];
  private readonly feedback = new FeedbackRenderer();
  private readonly particles = new ParticleEffects();
  private input: TouchInputManager;
  private readonly motion: MotionManager;
  private overdriveButtonRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private lastFrameMs = 0;
  private rafId = 0;
  private hasEnded = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly session: GameSession,
    private readonly laneConfig: LaneConfiguration,
    private readonly onEnd?: (result: PlayStats, failed: boolean) => void
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context is not available.");
    this.ctx = context;
    this.highway = computeHighwayGeometry(canvas.clientHeight);

    this.resize();
    window.addEventListener("resize", this.resize);
    // iOS Safari's address/toolbar showing or hiding often only fires a
    // visualViewport resize, not a window resize — without this the canvas
    // (and pad hit-rects) can drift out of sync with what's actually visible.
    window.visualViewport?.addEventListener("resize", this.resize);

    this.input = new TouchInputManager(canvas, this.pads, this.handlePadDown, this.handlePadUp);
    this.motion = new MotionManager(this.handleFlick);
    canvas.addEventListener("pointerdown", this.handleOverdriveButtonPointerDown);
    this.session.onJudgment(this.handleJudgment);
  }

  start(): void {
    this.session.start();
    this.lastFrameMs = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  /** Call after the caller has obtained motion permission (iOS requires a user-gesture prompt first). */
  enableMotion(): void {
    this.motion.start();
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resize);
    window.visualViewport?.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("pointerdown", this.handleOverdriveButtonPointerDown);
    this.motion.stop();
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

    const buttonWidth = width * OVERDRIVE_BUTTON_WIDTH_FRACTION;
    const buttonHeight = height * OVERDRIVE_BUTTON_HEIGHT_FRACTION;
    this.overdriveButtonRect = {
      x: (width - buttonWidth) / 2,
      y: this.highway.topY * 0.15,
      width: buttonWidth,
      height: buttonHeight,
    };
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
      vibrate(event.judgment === "perfect" ? HAPTIC_PATTERNS.perfect : HAPTIC_PATTERNS.hit);
    }
  };

  private handleFlick = (): void => {
    this.tryActivateOverdrive();
  };

  private handleOverdriveButtonPointerDown = (event: PointerEvent): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (rectContains(this.overdriveButtonRect, x, y)) {
      this.tryActivateOverdrive();
    }
  };

  private tryActivateOverdrive(): void {
    if (this.session.activateOverdrive()) {
      vibrate(HAPTIC_PATTERNS.overdriveActivate);
    }
  }

  private loop = (nowMs: number): void => {
    const dtSeconds = this.lastFrameMs ? (nowMs - this.lastFrameMs) / 1000 : 0;
    this.lastFrameMs = nowMs;

    this.session.update(dtSeconds);
    this.feedback.update(nowMs);
    this.particles.update(nowMs, dtSeconds);
    this.render(nowMs);

    if (!this.hasEnded && (this.session.state === "finished" || this.session.state === "failed")) {
      this.hasEnded = true;
      this.onEnd?.(this.session.getResult(), this.session.state === "failed");
    }

    if (this.session.state === "playing" || this.session.state === "countdown") {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  private render(nowMs: number): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);
    this.drawStage(width, height, nowMs);
    this.drawHighway(width);
    this.drawNotes();
    for (const pad of this.pads) pad.draw(ctx, nowMs);
    this.drawHud(width);
    this.feedback.draw(ctx, nowMs);
    this.particles.draw(ctx, nowMs);
    this.drawCountdown(width, height);
    if (this.session.state === "failed") this.drawFailedOverlay(width, height);
  }

  private drawFailedOverlay(width: number, height: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(5,5,10,0.72)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#e5383b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(width * 0.14)}px system-ui, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 16;
    ctx.fillText("YOU FAILED", width / 2, height / 2);
    ctx.restore();
  }

  private drawCountdown(width: number, height: number): void {
    const label = countdownLabel(-this.session.currentTime);
    if (!label) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${label === "ROCK!" ? Math.round(width * 0.16) : Math.round(width * 0.28)}px system-ui, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 20;
    ctx.fillText(label, width / 2, height / 2);
    ctx.restore();
  }

  private drawStage(width: number, height: number, nowMs: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (this.session.overdriveEngine.isActive) {
      gradient.addColorStop(0, "#2a1638");
      gradient.addColorStop(0.6, "#1c1030");
      gradient.addColorStop(1, "#0a0714");
    } else {
      gradient.addColorStop(0, "#0a0a16");
      gradient.addColorStop(0.6, "#12121f");
      gradient.addColorStop(1, "#050508");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    this.drawSpotlights(width, height, nowMs);
    this.drawCrowdSilhouette(width);
  }

  private drawSpotlights(width: number, height: number, nowMs: number): void {
    const ctx = this.ctx;
    const overdrive = this.session.overdriveEngine.isActive;
    const colors: [string, string] = overdrive ? ["#ff5fd8", "#4cc9f0"] : ["#4cc9f0", "#e5383b"];
    const sweep = Math.sin(nowMs / 4500) * width * 0.18;
    const radius = width * 0.55;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [index, color] of colors.entries()) {
      const cx = width * (index === 0 ? 0.2 : 0.8) + sweep * (index === 0 ? 1 : -1);
      const cy = height * 0.05;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, hexToRgba(color, 0.16));
      gradient.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height * 0.75);
    }
    ctx.restore();
  }

  private drawCrowdSilhouette(width: number): void {
    const ctx = this.ctx;
    const bandTop = this.highway.topY * 0.15;
    const bandHeight = this.highway.topY * 0.55;
    const bumpCount = 22;
    const bumpWidth = width / bumpCount;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (let i = 0; i < bumpCount; i++) {
      // Deterministic pseudo-randomness from a fixed seed pattern, not
      // Math.random(), so the silhouette doesn't reflicker every frame.
      const bump = 0.5 + 0.5 * Math.sin(i * 12.9898);
      const bumpH = bandHeight * (0.4 + bump * 0.6);
      const cx = i * bumpWidth + bumpWidth / 2;
      const cy = bandTop + bandHeight - bumpH / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, bumpWidth * 0.55, bumpH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
    const multiplier = this.session.effectiveMultiplier;

    ctx.save();
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(score).padStart(6, "0"), 16, 12);

    ctx.textAlign = "right";
    ctx.fillStyle = this.session.overdriveEngine.isActive ? "#ff5fd8" : multiplier >= 4 ? "#ffd60a" : "#ffffff";
    ctx.fillText(`${multiplier}X`, width - 16, 12);

    if (combo > 0) {
      ctx.textAlign = "left";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`COMBO x${combo}`, 16, 44);
    }
    ctx.restore();

    this.drawPerformanceMeter(width);
    this.drawOverdriveIndicator();
  }

  private drawPerformanceMeter(width: number): void {
    const ctx = this.ctx;
    const fraction = this.session.performanceMeter.fraction;
    const barHeight = 5;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, 0, width, barHeight);

    ctx.fillStyle = fraction > 0.5 ? "#57cc99" : fraction > 0.25 ? "#ffd60a" : "#e5383b";
    ctx.fillRect(0, 0, width * fraction, barHeight);
    ctx.restore();
  }

  private drawOverdriveIndicator(): void {
    const ctx = this.ctx;
    const overdrive = this.session.overdriveEngine;
    const rect = this.overdriveButtonRect;

    if (overdrive.isActive) {
      ctx.save();
      ctx.fillStyle = "#ff5fd8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(rect.height * 0.7)}px system-ui, sans-serif`;
      ctx.shadowColor = "#ff5fd8";
      ctx.shadowBlur = 14;
      ctx.fillText("OVERDRIVE!", rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.restore();
      return;
    }

    if (overdrive.isReady) {
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 150);
      ctx.save();
      ctx.globalAlpha = pulse;
      roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.height / 2);
      ctx.fillStyle = "#ffd60a";
      ctx.shadowColor = "#ffd60a";
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(rect.height * 0.55)}px system-ui, sans-serif`;
      ctx.fillText("OVERDRIVE READY", rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.restore();
      return;
    }

    // Charging: a thin outlined meter bar showing progress toward ready.
    ctx.save();
    roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.height / 2);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const fillWidth = rect.width * overdrive.meterFraction;
    if (fillWidth > 0) {
      roundedRect(ctx, rect.x, rect.y, fillWidth, rect.height, rect.height / 2);
      ctx.fillStyle = "#4cc9f0";
      ctx.fill();
    }
    ctx.restore();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
