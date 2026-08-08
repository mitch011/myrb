export type FlickCallback = () => void;

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/**
 * iOS 13+ requires DeviceMotionEvent.requestPermission() to be called
 * directly from a user-gesture handler before 'devicemotion' events will
 * ever fire. Call this first, synchronously-ish, in the same click handler
 * used to unlock audio. Returns true if motion is usable (permission
 * granted, or no permission model on this platform at all).
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof DeviceMotionEvent === "undefined") return false;

  const ctor = DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;
  if (typeof ctor.requestPermission !== "function") return true;

  try {
    return (await ctor.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

const DEFAULT_THRESHOLD_G = 2.2;
const DEFAULT_COOLDOWN_MS = 800;

/**
 * Detects a sharp tilt/flick from accelerometer data — the primary Overdrive
 * activation gesture. A cooldown prevents one flick from double-firing
 * across several devicemotion samples.
 */
export class MotionManager {
  private cooldownUntilMs = 0;
  private listening = false;

  constructor(
    private readonly onFlick: FlickCallback,
    private readonly thresholdG = DEFAULT_THRESHOLD_G,
    private readonly cooldownMs = DEFAULT_COOLDOWN_MS
  ) {}

  start(): void {
    if (this.listening || typeof DeviceMotionEvent === "undefined") return;
    window.addEventListener("devicemotion", this.handleMotion);
    this.listening = true;
  }

  stop(): void {
    window.removeEventListener("devicemotion", this.handleMotion);
    this.listening = false;
  }

  private handleMotion = (event: DeviceMotionEvent): void => {
    const acceleration = event.accelerationIncludingGravity ?? event.acceleration;
    if (!acceleration) return;

    const x = acceleration.x ?? 0;
    const y = acceleration.y ?? 0;
    const z = acceleration.z ?? 0;
    const magnitudeG = Math.sqrt(x * x + y * y + z * z) / 9.81;

    const nowMs = performance.now();
    if (magnitudeG > this.thresholdG && nowMs > this.cooldownUntilMs) {
      this.cooldownUntilMs = nowMs + this.cooldownMs;
      this.onFlick();
    }
  };
}
