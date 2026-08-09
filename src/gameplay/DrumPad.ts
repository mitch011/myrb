export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectContains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

const FLASH_DURATION_MS = 180;

/**
 * Drawn as a drum-head ellipse with a rim, not a generic rounded button —
 * the touch target stays the full rectangle (a rounder hit shape would be
 * less forgiving), but visually it should read as a drum pad.
 */
export class DrumPad {
  pressed = false;
  private flashUntilMs = 0;

  constructor(
    readonly lane: number,
    readonly label: string,
    readonly color: string,
    public rect: Rect
  ) {}

  press(nowMs: number): void {
    this.pressed = true;
    this.flashUntilMs = nowMs + FLASH_DURATION_MS;
  }

  release(): void {
    this.pressed = false;
  }

  isFlashing(nowMs: number): boolean {
    return nowMs < this.flashUntilMs;
  }

  draw(ctx: CanvasRenderingContext2D, nowMs: number): void {
    const { x, y, width, height } = this.rect;
    const depressed = this.pressed;
    const flashing = this.isFlashing(nowMs);

    const cx = x + width / 2;
    const cy = y + height / 2 + (depressed ? height * 0.02 : 0);
    const rimRx = width / 2 - 4;
    const rimRy = height / 2 - 4;
    const headShrink = depressed ? 0.9 : 1;
    const headRx = rimRx * 0.86 * headShrink;
    const headRy = rimRy * 0.86 * headShrink;

    ctx.save();

    // Rim: a dark metallic ring behind the head, like a drum shell edge.
    ctx.beginPath();
    ctx.ellipse(cx, cy, rimRx, rimRy, 0, 0, Math.PI * 2);
    const rimGradient = ctx.createLinearGradient(x, y, x, y + height);
    rimGradient.addColorStop(0, "#3a3a42");
    rimGradient.addColorStop(1, "#15151a");
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // Head: the color-coded drum skin the player actually reads as the pad.
    ctx.beginPath();
    ctx.ellipse(cx, cy, headRx, headRy, 0, 0, Math.PI * 2);
    const headGradient = ctx.createRadialGradient(
      cx - headRx * 0.3,
      cy - headRy * 0.4,
      headRx * 0.1,
      cx,
      cy,
      headRx
    );
    if (flashing) {
      headGradient.addColorStop(0, "#ffffff");
      headGradient.addColorStop(0.5, lighten(this.color));
      headGradient.addColorStop(1, this.color);
    } else {
      headGradient.addColorStop(0, lighten(this.color));
      headGradient.addColorStop(1, shade(this.color, depressed ? -35 : -10));
    }
    ctx.fillStyle = headGradient;
    if (flashing) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 22;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.stroke();

    // Specular highlight arc for a glossy drum-head look.
    ctx.beginPath();
    ctx.ellipse(cx - headRx * 0.25, cy - headRy * 0.4, headRx * 0.5, headRy * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `bold ${Math.round(height * 0.14)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, cx, cy + headRy * 0.55);

    ctx.restore();
  }
}

function lighten(hex: string): string {
  return shade(hex, 70);
}

function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel + amount));
  const r = clamp((value >> 16) & 0xff);
  const g = clamp((value >> 8) & 0xff);
  const b = clamp(value & 0xff);
  return `rgb(${r},${g},${b})`;
}
