/**
 * Radial sweep animation for the scanning loading state.
 * Concentric rings expand from center, creating a radar-like effect
 * using braille characters.
 */

import { createGrid, setCell, gridToString, charFromDensity, BRAILLE_DENSITY } from './engine.js';

interface ScanAnimationOptions {
  width: number;
  height: number;
  /** Frame counter — drives the animation */
  frame: number;
}

export function generateScanFrame(opts: ScanAnimationOptions): string {
  const { width, height, frame } = opts;
  const grid = createGrid(width, height);

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.sqrt(cx * cx + cy * cy);

  // Sweep parameters
  const sweepSpeed = 0.15;
  const sweepAngle = (frame * 0.08) % (Math.PI * 2);
  const ringPhase = frame * sweepSpeed;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      // Scale Y by 2 because terminal chars are ~2x tall as wide
      const dy = (y - cy) * 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Concentric rings moving outward
      const ringVal = Math.sin(dist * 0.6 - ringPhase) * 0.5 + 0.5;

      // Radial sweep (bright line rotating)
      let angleDiff = Math.abs(angle - sweepAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const sweepVal = Math.max(0, 1 - angleDiff * 2);

      // Trail behind the sweep
      let trailAngleDiff = angle - sweepAngle;
      if (trailAngleDiff < -Math.PI) trailAngleDiff += Math.PI * 2;
      if (trailAngleDiff > Math.PI) trailAngleDiff -= Math.PI * 2;
      const trailVal = trailAngleDiff > 0 && trailAngleDiff < 1.5
        ? (1 - trailAngleDiff / 1.5) * 0.3
        : 0;

      // Fade with distance from center
      const distFade = Math.max(0, 1 - dist / maxRadius);

      // Combine effects
      const value = (ringVal * 0.3 + sweepVal * 0.5 + trailVal) * distFade;

      if (value > 0.05) {
        setCell(grid, x, y, charFromDensity(value));
      }
    }
  }

  return gridToString(grid);
}
