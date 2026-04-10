/**
 * Art engine — seeded PRNG, character palettes, and grid utilities
 * for rendering generative art in the terminal using Unicode characters.
 */

// ── Seeded PRNG (xorshift128) ──────────────────────────────────────────

export class PRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    this.s = new Uint32Array(4);
    this.s[0] = seed >>> 0;
    this.s[1] = (seed * 1812433253 + 1) >>> 0;
    this.s[2] = (this.s[1] * 1812433253 + 1) >>> 0;
    this.s[3] = (this.s[2] * 1812433253 + 1) >>> 0;
    // Warm up
    for (let i = 0; i < 20; i++) this.next();
  }

  /** Returns a float in [0, 1) */
  next(): number {
    const t = this.s[3];
    let s = this.s[0];
    this.s[3] = this.s[2];
    this.s[2] = this.s[1];
    this.s[1] = s;
    s ^= s << 11;
    s ^= s >>> 8;
    s ^= t ^ (t >>> 19);
    this.s[0] = s;
    return (s >>> 0) / 4294967296;
  }

  /** Returns an int in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// ── Character Palettes ────────────────────────────────────────────────

/** Braille density levels from empty to full (7 levels) */
export const BRAILLE_DENSITY = [' ', '\u2802', '\u2812', '\u2816', '\u28a4', '\u28b6', '\u28ff'];

/** Block density levels (4 levels) */
export const BLOCK_DENSITY = ['\u2591', '\u2592', '\u2593', '\u2588'];

/** Map a 0-1 value to a braille character */
export function charFromDensity(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  const index = Math.floor(clamped * (BRAILLE_DENSITY.length - 1));
  return BRAILLE_DENSITY[index];
}

/** Map a 0-1 value to a block character */
export function blockFromDensity(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  const index = Math.floor(clamped * (BLOCK_DENSITY.length - 1));
  return BLOCK_DENSITY[index];
}

// ── Grid Utilities ────────────────────────────────────────────────────

export type Grid = string[][];

/** Create a 2D grid filled with a character */
export function createGrid(width: number, height: number, fill = ' '): Grid {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

/** Flatten a 2D grid to a string (one row per line) */
export function gridToString(grid: Grid): string {
  return grid.map((row) => row.join('')).join('\n');
}

/** Set a cell in the grid with bounds checking */
export function setCell(grid: Grid, x: number, y: number, char: string): void {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = char;
  }
}

/** Lerp between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── BrailleCanvas ────────────────────────────────────────────────────
//
// A pixel-level canvas where each terminal cell encodes a 2x4 sub-pixel
// grid via Unicode braille (U+2800 base + bit-OR'd dots).
//
// Sub-pixel coordinate system (per cell):
//
//   col 0   col 1
//   ┌─────┬─────┐
//   │ 0,0 │ 0,1 │  row 0
//   ├─────┼─────┤
//   │ 1,0 │ 1,1 │  row 1
//   ├─────┼─────┤
//   │ 2,0 │ 2,1 │  row 2
//   ├─────┼─────┤
//   │ 3,0 │ 3,1 │  row 3
//   └─────┴─────┘
//
// Standard braille dot bit map:
//   col 0 ↔ rows 0..3 → 0x01, 0x02, 0x04, 0x40
//   col 1 ↔ rows 0..3 → 0x08, 0x10, 0x20, 0x80

const DOT_BITS: number[][] = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

export class BrailleCanvas {
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  private bits: Uint8Array;

  constructor(cellWidth: number, cellHeight: number) {
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.pixelWidth = cellWidth * 2;
    this.pixelHeight = cellHeight * 4;
    this.bits = new Uint8Array(cellWidth * cellHeight);
  }

  /** Set a sub-pixel at integer pixel coordinates */
  set(px: number, py: number): void {
    const x = Math.round(px);
    const y = Math.round(py);
    if (x < 0 || x >= this.pixelWidth || y < 0 || y >= this.pixelHeight) return;
    const cx = (x / 2) | 0;
    const cy = (y / 4) | 0;
    const dx = x - cx * 2;
    const dy = y - cy * 4;
    this.bits[cy * this.cellWidth + cx] |= DOT_BITS[dy][dx];
  }

  /** Clear a sub-pixel */
  clear(px: number, py: number): void {
    const x = Math.round(px);
    const y = Math.round(py);
    if (x < 0 || x >= this.pixelWidth || y < 0 || y >= this.pixelHeight) return;
    const cx = (x / 2) | 0;
    const cy = (y / 4) | 0;
    const dx = x - cx * 2;
    const dy = y - cy * 4;
    this.bits[cy * this.cellWidth + cx] &= ~DOT_BITS[dy][dx];
  }

  /** Bresenham line in pixel space */
  line(x0: number, y0: number, x1: number, y1: number): void {
    let xa = Math.round(x0);
    let ya = Math.round(y0);
    const xb = Math.round(x1);
    const yb = Math.round(y1);
    const dx = Math.abs(xb - xa);
    const dy = -Math.abs(yb - ya);
    const sx = xa < xb ? 1 : -1;
    const sy = ya < yb ? 1 : -1;
    let err = dx + dy;
    while (true) {
      this.set(xa, ya);
      if (xa === xb && ya === yb) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; xa += sx; }
      if (e2 <= dx) { err += dx; ya += sy; }
    }
  }

  /** Reset the canvas to empty */
  clearAll(): void {
    this.bits.fill(0);
  }

  /** Convert to a 2D Grid of braille characters (' ' for empty cells) */
  toGrid(): Grid {
    const grid: Grid = Array.from({ length: this.cellHeight }, () =>
      Array(this.cellWidth).fill(' ')
    );
    for (let cy = 0; cy < this.cellHeight; cy++) {
      for (let cx = 0; cx < this.cellWidth; cx++) {
        const v = this.bits[cy * this.cellWidth + cx];
        grid[cy][cx] = v === 0 ? ' ' : String.fromCharCode(0x2800 | v);
      }
    }
    return grid;
  }

  /** Convert directly to a string (one row per line) */
  toString(): string {
    return gridToString(this.toGrid());
  }
}
