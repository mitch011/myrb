import type { Judgment } from "@core/TimingConfiguration";

interface FeedbackPopup {
  text: string;
  color: string;
  x: number;
  y: number;
  startMs: number;
}

const DURATION_MS = 500;
const RISE_PX = 40;

const JUDGMENT_LABELS: Record<Judgment, string> = {
  perfect: "PERFECT!",
  great: "GREAT!",
  good: "GOOD!",
  miss: "MISS",
};

const JUDGMENT_COLORS: Record<Judgment, string> = {
  perfect: "#ffd60a",
  great: "#4cc9f0",
  good: "#57cc99",
  miss: "#e5383b",
};

/** Floating "PERFECT!" / "MISS" text popups that rise and fade near the hit line. */
export class FeedbackRenderer {
  private popups: FeedbackPopup[] = [];

  spawn(judgment: Judgment, x: number, y: number, nowMs: number): void {
    this.popups.push({
      text: JUDGMENT_LABELS[judgment],
      color: JUDGMENT_COLORS[judgment],
      x,
      y,
      startMs: nowMs,
    });
  }

  update(nowMs: number): void {
    this.popups = this.popups.filter((popup) => nowMs - popup.startMs < DURATION_MS);
  }

  draw(ctx: CanvasRenderingContext2D, nowMs: number): void {
    for (const popup of this.popups) {
      const age = nowMs - popup.startMs;
      const t = age / DURATION_MS;
      const y = popup.y - RISE_PX * t;
      const alpha = 1 - t;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = popup.color;
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6;
      ctx.fillText(popup.text, popup.x, y);
      ctx.restore();
    }
  }
}
