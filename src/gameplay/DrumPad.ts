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
    const inset = 6;
    const depressed = this.pressed;
    const flashing = this.isFlashing(nowMs);

    ctx.save();
    ctx.translate(0, depressed ? 4 : 0);

    const radius = Math.min(width, height) * 0.16;
    roundedRect(ctx, x + inset, y + inset, width - inset * 2, height - inset * 2, radius);

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    if (flashing) {
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(1, this.color);
    } else {
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, shade(this.color, depressed ? -40 : -15));
    }
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `bold ${Math.round(height * 0.16)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.label, x + width / 2, y + height / 2);

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
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel + amount));
  const r = clamp((value >> 16) & 0xff);
  const g = clamp((value >> 8) & 0xff);
  const b = clamp(value & 0xff);
  return `rgb(${r},${g},${b})`;
}
