import { DiskEntry, Insight, AGE_WARN_MS, AGE_STALE_MS } from '../types/index.js';

/** A rule maps an entry to at most one insight. */
export type InsightRule = (entry: DiskEntry) => Insight | null;

/** Artifact labels that regenerate on the next build/install. */
const REBUILDABLE_LABELS = new Set([
  'node_modules',
  '.next',
  '.nuxt',
  '.turbo',
  'dist',
  'build',
  'out',
  '.cache',
  'Xcode DerivedData',
  '.gradle',
  '.m2',
  'pnpm store',
  'bun cache',
]);

const ONE_GB = 1024 ** 3;

/** Age-based staleness. Stale (90d+) is a strong delete signal; aging is softer. */
const staleRule: InsightRule = (e) => {
  if (e.ageMs >= AGE_STALE_MS) return { key: 'stale', label: 'stale 90d+', tone: 'warn' };
  if (e.ageMs >= AGE_WARN_MS) return { key: 'aging', label: '30d+ idle', tone: 'info' };
  return null;
};

/** The entry will be recreated by a build/install, so removal is low-risk. */
const rebuildableRule: InsightRule = (e) =>
  REBUILDABLE_LABELS.has(e.artifactType.label)
    ? { key: 'rebuildable', label: 'rebuildable', tone: 'good' }
    : null;

/** Docker reclaimable resources. */
const dockerRule: InsightRule = (e) =>
  e.category === 'docker' ? { key: 'reclaimable', label: 'reclaimable', tone: 'good' } : null;

/** Large entries are worth attention regardless of age. */
const largeRule: InsightRule = (e) =>
  e.sizeBytes >= ONE_GB ? { key: 'large', label: 'large', tone: 'info' } : null;

export const DEFAULT_RULES: InsightRule[] = [staleRule, rebuildableRule, dockerRule, largeRule];

/**
 * Tags entries with human-meaningful insights (stale, rebuildable, …). Rules
 * are a list, so new tags plug in without touching callers (OCP).
 */
export class InsightEngine {
  constructor(private readonly rules: InsightRule[] = DEFAULT_RULES) {}

  analyze(entry: DiskEntry): Insight[] {
    const out: Insight[] = [];
    for (const rule of this.rules) {
      const insight = rule(entry);
      if (insight) out.push(insight);
    }
    return out;
  }
}
