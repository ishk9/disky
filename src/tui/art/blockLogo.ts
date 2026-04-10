/**
 * blockLogo — renders text as chunky block-pixel art.
 *
 * Each lit font pixel becomes a `BLOCK` string repeated across `pixelRows`
 * terminal rows, with single-char gaps between horizontal pixels. The result
 * looks like the Mistral Vibe logo: large, solid, separated tile letters.
 */

// 5×7 pixel font (lowercase). '#' = lit pixel, '.' = empty.
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

const FONT_HEIGHT = 7;

/** Two block characters per lit pixel — gives solid tile appearance */
const BLOCK = '\u2588\u2588';
/** Matching empty space for unlit pixels */
const EMPTY = '  ';
/** Gap between adjacent horizontal pixels */
const H_GAP = ' ';
/** Gap between adjacent letters */
const LETTER_SEP = '   ';

/**
 * Render text as block-pixel art.
 *
 * Returns an array of strings, one per terminal row.
 * `pixelRows` controls how many terminal rows each font pixel occupies
 * (2 gives the chunky Mistral-style look, 1 is more compact).
 * `compact` uses single-char blocks with no gaps — fits narrow panels (~28 cols for "disky").
 */
export function generateBlockLogo(text: string, pixelRows = 2, compact = false): string[] {
  const block = compact ? '\u2588' : BLOCK;
  const empty = compact ? ' '     : EMPTY;
  const hGap  = compact ? ''      : H_GAP;
  const lSep  = compact ? ' '     : LETTER_SEP;

  const chars = text.toLowerCase().split('');
  const rows: string[] = [];

  for (let fontRow = 0; fontRow < FONT_HEIGHT; fontRow++) {
    const parts: string[] = [];
    let first = true;

    for (const c of chars) {
      const glyph = FONT[c];
      if (!glyph) continue;
      if (!first) parts.push(lSep);
      first = false;

      const cells = Array.from(glyph[fontRow]).map((ch) =>
        ch === '#' ? block : empty
      );
      parts.push(cells.join(hGap));
    }

    const rowStr = parts.join('');
    for (let r = 0; r < pixelRows; r++) {
      rows.push(rowStr);
    }
  }

  return rows;
}

/** Width in characters of the rendered logo */
export function blockLogoWidth(text: string): number {
  const chars = text.toLowerCase().split('');
  let total = 0;
  let first = true;
  for (const c of chars) {
    const glyph = FONT[c];
    if (!glyph) continue;
    if (!first) total += LETTER_SEP.length;
    first = false;
    total += glyph[0].length * BLOCK.length + (glyph[0].length - 1) * H_GAP.length;
  }
  return total;
}

/** Height in rows of the rendered logo */
export function blockLogoHeight(pixelRows = 2): number {
  return FONT_HEIGHT * pixelRows;
}
