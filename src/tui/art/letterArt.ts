/**
 * letterArt — render short text as braille pixel art using a tiny 5x7 font.
 */

import { BrailleCanvas } from './engine.js';

// 5x7 pixel font, lowercase only. '#' = lit pixel, '.' = empty.
const FONT: Record<string, string[]> = {
  d: [
    '....#',
    '....#',
    '.####',
    '#...#',
    '#...#',
    '#...#',
    '.####',
  ],
  i: [
    '###',
    '.#.',
    '.#.',
    '.#.',
    '.#.',
    '.#.',
    '###',
  ],
  s: [
    '.####',
    '#....',
    '#....',
    '.###.',
    '....#',
    '....#',
    '####.',
  ],
  k: [
    '#...#',
    '#..#.',
    '#.#..',
    '##...',
    '#.#..',
    '#..#.',
    '#...#',
  ],
  y: [
    '#...#',
    '#...#',
    '.#.#.',
    '.#.#.',
    '..#..',
    '..#..',
    '..#..',
  ],
};

const GLYPH_HEIGHT = 7;

/**
 * Render the given text as a braille string. Unknown characters are skipped.
 *
 * `scale` upscales the font: each lit pixel becomes a `scale × scale` block.
 * scale=2 makes the logo bolder AND larger (recommended).
 */
export function generateTextLogo(text: string, scale = 2, letterSpacing = 1): string {
  const chars = text.toLowerCase().split('');

  // Compute total pixel width (scaled)
  let totalWidth = 0;
  for (let i = 0; i < chars.length; i++) {
    const glyph = FONT[chars[i]];
    if (!glyph) continue;
    totalWidth += glyph[0].length * scale;
    if (i < chars.length - 1) totalWidth += letterSpacing * scale;
  }

  if (totalWidth === 0) return '';

  const heightPx = GLYPH_HEIGHT * scale;
  const cellWidth = Math.ceil(totalWidth / 2);
  const cellHeight = Math.ceil(heightPx / 4);
  const canvas = new BrailleCanvas(cellWidth, cellHeight);

  let xOffset = 0;
  for (const c of chars) {
    const glyph = FONT[c];
    if (!glyph) continue;
    const gw = glyph[0].length;
    for (let y = 0; y < glyph.length; y++) {
      for (let x = 0; x < gw; x++) {
        if (glyph[y][x] !== '#') continue;
        // Fill a scale×scale block of sub-pixels for bold strokes
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            canvas.set(xOffset + x * scale + dx, y * scale + dy);
          }
        }
      }
    }
    xOffset += gw * scale + letterSpacing * scale;
  }

  return canvas.toString();
}
