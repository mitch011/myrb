import type { NoteRuntime } from "@chart/NoteRuntime";
import type { HighwayGeometry } from "./HitZone";
import type { LaneGeometry } from "./Lane";
import { pillRect } from "./CanvasShapes";

export const DEFAULT_LEAD_TIME_SECONDS = 1.8;

/** 0 = note just spawned at the top of the highway, 1 = note is at the hit line. */
export function noteProgress(
  note: Pick<NoteRuntime, "timestamp">,
  currentTime: number,
  leadTimeSeconds: number
): number {
  const timeUntilHit = note.timestamp - currentTime;
  return 1 - timeUntilHit / leadTimeSeconds;
}

export function noteY(progress: number, highway: HighwayGeometry): number {
  return highway.topY + progress * (highway.hitZoneY - highway.topY);
}

/** Drawn as a horizontal capsule/bar spanning most of the lane's width, not a circle. */
export function drawNote(
  ctx: CanvasRenderingContext2D,
  lane: LaneGeometry,
  y: number,
  color: string,
  isSpecial: boolean
): void {
  const barWidth = lane.width * 0.8;
  const barHeight = Math.max(10, Math.min(lane.width, 70) * 0.34);
  const x = lane.centerX - barWidth / 2;
  const top = y - barHeight / 2;

  ctx.save();
  ctx.shadowColor = isSpecial ? "#ffffff" : color;
  ctx.shadowBlur = isSpecial ? 18 : 10;

  const gradient = ctx.createLinearGradient(x, top, x, top + barHeight);
  if (isSpecial) {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, lightenColor(color));
    gradient.addColorStop(1, color);
  } else {
    gradient.addColorStop(0, lightenColor(color));
    gradient.addColorStop(1, color);
  }
  ctx.fillStyle = gradient;
  pillRect(ctx, x, top, barWidth, barHeight);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = isSpecial ? "#ffffff" : "rgba(255,255,255,0.5)";
  ctx.stroke();

  // A thin bright seam near the top gives the capsule a cylindrical look.
  ctx.beginPath();
  pillRect(ctx, x + barWidth * 0.08, top + barHeight * 0.15, barWidth * 0.84, barHeight * 0.2);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();

  ctx.restore();
}

function lightenColor(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((value >> 16) & 0xff) + 80);
  const g = Math.min(255, ((value >> 8) & 0xff) + 80);
  const b = Math.min(255, (value & 0xff) + 80);
  return `rgb(${r},${g},${b})`;
}
