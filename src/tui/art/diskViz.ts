/**
 * Disk usage visualization — renders scan results as visual representations
 * using block characters. Creates a treemap-style proportional view.
 */

import { blockFromDensity, BLOCK_DENSITY } from './engine.js';
import { DiskEntry, AGE_STALE_MS, AGE_WARN_MS } from '../../types/index.js';

/** ANSI color name for an artifact type */
function artifactColor(entry: DiskEntry): string {
  return entry.artifactType.color;
}

interface BarEntry {
  label: string;
  size: string;
  ratio: number;
  color: string;
  ageIntensity: number;
}

/**
 * Render a proportional bar chart showing disk usage breakdown.
 * Each entry gets a horizontal bar whose length is proportional to its size.
 */
export function generateDiskBars(entries: DiskEntry[], maxWidth = 40): BarEntry[] {
  if (entries.length === 0) return [];

  const maxBytes = entries[0].sizeBytes;

  return entries.slice(0, 10).map((entry) => {
    const ratio = maxBytes > 0 ? entry.sizeBytes / maxBytes : 0;
    // Age intensity: 0 = fresh, 1 = very stale
    const ageIntensity = entry.ageMs >= AGE_STALE_MS ? 1 : entry.ageMs >= AGE_WARN_MS ? 0.6 : 0.2;

    return {
      label: entry.artifactType.label,
      size: entry.sizeHuman,
      ratio,
      color: entry.artifactType.color,
      ageIntensity,
    };
  });
}

/**
 * Generate a compact summary bar (single line) showing relative proportions.
 * Like a stacked bar chart using block characters.
 */
export function generateSummaryBar(entries: DiskEntry[], width = 50): string {
  if (entries.length === 0) return '';

  const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
  if (totalBytes === 0) return '';

  const chars: string[] = [];

  for (const entry of entries) {
    const proportion = entry.sizeBytes / totalBytes;
    const charCount = Math.max(1, Math.round(proportion * width));

    // Use different block density based on age
    const density = entry.ageMs >= AGE_STALE_MS ? 1 : entry.ageMs >= AGE_WARN_MS ? 0.7 : 0.4;
    const char = blockFromDensity(density);

    for (let i = 0; i < charCount && chars.length < width; i++) {
      chars.push(char);
    }
  }

  // Fill remaining space
  while (chars.length < width) {
    chars.push(' ');
  }

  return chars.join('');
}
