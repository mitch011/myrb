interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  bornMs: number;
}

const LIFETIME_MS = 350;
const PARTICLES_PER_BURST = 6;

/** Small, subtle burst on a successful hit. Kept sparse per the "don't overwhelm" design rule. */
export class ParticleEffects {
  private particles: Particle[] = [];

  burst(x: number, y: number, color: string, nowMs: number): void {
    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST + Math.random() * 0.4;
      const speed = 60 + Math.random() * 60;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        bornMs: nowMs,
      });
    }
  }

  update(nowMs: number, dtSeconds: number): void {
    this.particles = this.particles.filter((p) => nowMs - p.bornMs < LIFETIME_MS);
    for (const p of this.particles) {
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
    }
  }

  draw(ctx: CanvasRenderingContext2D, nowMs: number): void {
    for (const p of this.particles) {
      const age = nowMs - p.bornMs;
      const alpha = 1 - age / LIFETIME_MS;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
