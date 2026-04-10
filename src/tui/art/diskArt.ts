/**
 * diskArt — Spinning vinyl-disk renderer.
 *
 * Drawn as a stack of concentric ellipses (the tilted projection of a flat
 * disk seen from the side), with three rotating spokes on the inner label
 * to communicate the spin. Subtle wobble in the vertical radius gives the
 * "gyrating" feel.
 */

import { BrailleCanvas } from './engine.js';

export interface DiskFrameOptions {
  cellWidth: number;
  cellHeight: number;
  /** Animation time, scaled in caller (frame * dt) */
  time: number;
  seed?: number;
}

/** Draw an ellipse outline by sampling the parametric form and connecting samples */
function drawEllipse(canvas: BrailleCanvas, cx: number, cy: number, rx: number, ry: number): void {
  if (rx <= 0 || ry <= 0) return;
  const samples = Math.max(48, Math.floor(Math.max(rx, ry) * 4));
  let prevX = cx + rx;
  let prevY = cy;
  for (let i = 1; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    canvas.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }
}

export function generateDiskFrame(opts: DiskFrameOptions): string {
  const { cellWidth, cellHeight, time } = opts;
  const canvas = new BrailleCanvas(cellWidth, cellHeight);

  const W = canvas.pixelWidth;
  const H = canvas.pixelHeight;
  const cx = W / 2;
  const cy = H / 2;

  // Disk fits inside the canvas with some margin.
  // The ellipse is wider than tall because we're seeing a flat disk from
  // a tilted angle. The vertical radius squashes by ~0.45.
  const baseRx = Math.min(W * 0.46, H * 0.95);
  const baseRy = baseRx * 0.42;

  // Slow wobble — vertical radius breathes a bit, like the disk gyrates.
  const wobble = 1 + 0.10 * Math.sin(time * 0.6);
  const rx = baseRx;
  const ry = baseRy * wobble;

  // Continuous spin angle for the rotating elements on the label.
  const spin = time * 1.4;

  // Concentric grooves — outer edge plus a few inner rings.
  const grooves = [1.0, 0.92, 0.82, 0.70, 0.55, 0.42];
  for (const g of grooves) {
    drawEllipse(canvas, cx, cy, rx * g, ry * g);
  }

  // Inner label boundary (smaller, denser).
  drawEllipse(canvas, cx, cy, rx * 0.30, ry * 0.30);

  // Three rotating spokes on the label (120° apart) — visible spin cue.
  const labelInner = 0.06;
  const labelOuter = 0.28;
  for (let s = 0; s < 3; s++) {
    const a = spin + (s * Math.PI * 2) / 3;
    const x1 = cx + Math.cos(a) * rx * labelInner;
    const y1 = cy + Math.sin(a) * ry * labelInner;
    const x2 = cx + Math.cos(a) * rx * labelOuter;
    const y2 = cy + Math.sin(a) * ry * labelOuter;
    canvas.line(x1, y1, x2, y2);
  }

  // Center spindle dot.
  canvas.set(cx, cy);
  canvas.set(cx + 1, cy);
  canvas.set(cx - 1, cy);

  // A single bright tick on the outer rim that orbits — extra rotation cue.
  const rimAngle = spin * 0.7;
  const rimX = cx + Math.cos(rimAngle) * rx;
  const rimY = cy + Math.sin(rimAngle) * ry;
  canvas.set(rimX, rimY);
  canvas.set(rimX + 1, rimY);
  canvas.set(rimX - 1, rimY);
  canvas.set(rimX, rimY + 1);
  canvas.set(rimX, rimY - 1);

  return canvas.toString();
}
