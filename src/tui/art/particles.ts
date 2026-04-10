/**
 * Particle dissolve effect — characters scatter downward
 * as braille dots when entries are deleted.
 */

import { PRNG, charFromDensity, createGrid, setCell, gridToString } from './engine.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private rng: PRNG;

  constructor(seed = 1) {
    this.rng = new PRNG(seed);
  }

  /** Spawn particles from a text string at a given row */
  spawnFromText(text: string, row: number, count = 20): void {
    for (let i = 0; i < count; i++) {
      const charIdx = this.rng.int(0, text.length - 1);
      this.particles.push({
        x: charIdx,
        y: row,
        vx: (this.rng.next() - 0.5) * 1.5,
        vy: this.rng.next() * 0.8 + 0.3,
        life: 1,
        maxLife: 8 + this.rng.int(0, 6),
      });
    }
  }

  /** Advance simulation by one step */
  step(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life++;
    }
    // Remove dead particles
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  /** Render particles to a string grid */
  render(width: number, height: number): string {
    const grid = createGrid(width, height);

    for (const p of this.particles) {
      const ix = Math.round(p.x);
      const iy = Math.round(p.y);
      const lifeRatio = 1 - p.life / p.maxLife;
      setCell(grid, ix, iy, charFromDensity(lifeRatio));
    }

    return gridToString(grid);
  }

  get alive(): boolean {
    return this.particles.length > 0;
  }
}
