import type { NoteRuntime } from "@chart/NoteRuntime";
import type { HighwayGeometry } from "./HitZone";
import type { LaneGeometry } from "./Lane";

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

export function drawNote(
  ctx: CanvasRenderingContext2D,
  lane: LaneGeometry,
  y: number,
  color: string,
  isSpecial: boolean
): void {
  const radius = Math.min(lane.width, 60) * 0.32;

  ctx.save();
  if (isSpecial) {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 18;
  } else {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  const gradient = ctx.createRadialGradient(
    lane.centerX - radius * 0.3,
    y - radius * 0.3,
    radius * 0.15,
    lane.centerX,
    y,
    radius
  );
  gradient.addColorStop(0, isSpecial ? "#ffffff" : lightenColor(color));
  gradient.addColorStop(1, color);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(lane.centerX, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = isSpecial ? "#ffffff" : "rgba(255,255,255,0.5)";
  ctx.stroke();
  ctx.restore();
}

function lightenColor(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((value >> 16) & 0xff) + 80);
  const g = Math.min(255, ((value >> 8) & 0xff) + 80);
  const b = Math.min(255, (value & 0xff) + 80);
  return `rgb(${r},${g},${b})`;
}
