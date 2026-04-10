/**
 * Flow field generator — produces organic braille patterns
 * driven by simplex noise for the Digital Mycelium aesthetic.
 */

import { SimplexNoise } from './noise.js';
import { PRNG, charFromDensity, createGrid, setCell, gridToString, Grid } from './engine.js';

interface FlowFieldOptions {
  width: number;
  height: number;
  seed: number;
  /** Noise scale — lower = larger features */
  scale?: number;
  /** Time offset for animation */
  time?: number;
  /** Number of noise octaves */
  octaves?: number;
  /** Density multiplier */
  intensity?: number;
}

/** Generate a single frame of the flow field as a string */
export function generateFlowField(opts: FlowFieldOptions): string {
  const { width, height, seed, scale = 0.06, time = 0, octaves = 3, intensity = 1.0 } = opts;

  const noise = new SimplexNoise(seed);
  const grid = createGrid(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sample noise at this position with time evolution
      const nx = x * scale;
      const ny = y * scale;

      // Multi-octave noise for organic density
      const density = noise.fbm(nx + time * 0.3, ny + time * 0.2, octaves);

      // Second noise layer for directional flow variation
      const flow = noise.fbm(nx * 1.5 + 100, ny * 1.5 + 100 + time * 0.15, 2);

      // Combine: density determines character, flow adds variation
      const combined = density * 0.7 + flow * 0.3;
      const value = Math.pow(combined, 1.2) * intensity;

      setCell(grid, x, y, charFromDensity(value));
    }
  }

  return gridToString(grid);
}

/** Generate a flow field with filament trails (more organic look) */
export function generateMyceliumField(opts: FlowFieldOptions & { filaments?: number }): string {
  const { width, height, seed, scale = 0.04, time = 0, filaments = 80 } = opts;

  const noise = new SimplexNoise(seed);
  const rng = new PRNG(seed + 42);
  const density = Array.from({ length: height }, () => new Float32Array(width));

  // Spawn filaments and trace their paths through the noise field
  for (let f = 0; f < filaments; f++) {
    let x = rng.next() * width;
    let y = rng.next() * height;
    const steps = 30 + rng.int(0, 40);

    for (let s = 0; s < steps; s++) {
      const ix = Math.floor(x);
      const iy = Math.floor(y);

      if (ix < 0 || ix >= width || iy < 0 || iy >= height) break;

      // Accumulate density at this point
      const falloff = 1 - s / steps;
      density[iy][ix] = Math.min(1, density[iy][ix] + 0.15 * falloff);

      // Follow the noise field
      const angle = noise.noise2D(x * scale + time * 0.2, y * scale + time * 0.15) * Math.PI * 2;
      x += Math.cos(angle) * 0.8;
      y += Math.sin(angle) * 0.8;
    }
  }

  // Convert density grid to characters
  const grid = createGrid(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (density[y][x] > 0.01) {
        setCell(grid, x, y, charFromDensity(density[y][x]));
      }
    }
  }

  return gridToString(grid);
}
