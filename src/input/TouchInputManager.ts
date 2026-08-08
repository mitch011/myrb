import type { DrumPad } from "@gameplay/DrumPad";
import { rectContains } from "@gameplay/DrumPad";

export type PadCallback = (lane: number) => void;

/**
 * Multi-touch pad input. Uses Pointer Events so simultaneous physical touches
 * (each with a distinct pointerId) map to independent pad presses — required
 * for chords and two-thumb play.
 */
export class TouchInputManager {
  private readonly activePointers = new Map<number, number>(); // pointerId -> lane

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly pads: DrumPad[],
    private readonly onPadDown: PadCallback,
    private readonly onPadUp: PadCallback
  ) {
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerEnd);
    canvas.addEventListener("pointercancel", this.handlePointerEnd);
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerEnd);
    this.canvas.removeEventListener("pointercancel", this.handlePointerEnd);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    const { x, y } = this.toCanvasCoordinates(event);
    const pad = this.pads.find((p) => rectContains(p.rect, x, y));
    if (!pad) return;

    this.activePointers.set(event.pointerId, pad.lane);
    this.onPadDown(pad.lane);
  };

  private handlePointerEnd = (event: PointerEvent): void => {
    const lane = this.activePointers.get(event.pointerId);
    if (lane === undefined) return;
    this.activePointers.delete(event.pointerId);
    this.onPadUp(lane);
  };

  // Pad rects are authored in CSS-pixel space (the same logical space the
  // renderer draws in after its devicePixelRatio scale), so touch points only
  // need to be made relative to the canvas — no DPR scaling here.
  private toCanvasCoordinates(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }
}
