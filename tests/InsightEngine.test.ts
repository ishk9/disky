import { describe, it, expect } from 'vitest';
import { InsightEngine } from '../src/insights/InsightEngine';
import { AGE_STALE_MS, AGE_WARN_MS } from '../src/types';
import type { DiskEntry, EntryCategory } from '../src/types';

function entry(o: {
  label?: string;
  ageMs?: number;
  sizeBytes?: number;
  category?: EntryCategory;
}): DiskEntry {
  return {
    id: 1,
    category: o.category ?? 'artifact',
    sizeBytes: o.sizeBytes ?? 1024,
    sizeHuman: '1 KB',
    artifactType: {
      label: o.label ?? 'node_modules',
      color: 'green',
      safeToClean: true,
      cleanPolicy: 'auto',
    },
    absolutePath: '/x',
    displayPath: '~/x',
    project: null,
    directory: null,
    gitBranch: null,
    ageMs: o.ageMs ?? 0,
    ageHuman: '–',
    isDockerEntry: o.category === 'docker',
    dockerSummary: null,
    topOffenders: [],
  };
}

describe('InsightEngine', () => {
  const engine = new InsightEngine();
  const keys = (e: DiskEntry) => engine.analyze(e).map((i) => i.key);

  it('tags rebuildable artifacts', () => {
    expect(keys(entry({ label: 'node_modules' }))).toContain('rebuildable');
    expect(keys(entry({ label: 'random-dir' }))).not.toContain('rebuildable');
  });

  it('tags stale (90d+) vs aging (30d+)', () => {
    expect(keys(entry({ ageMs: AGE_STALE_MS + 1 }))).toContain('stale');
    expect(keys(entry({ ageMs: AGE_WARN_MS + 1 }))).toContain('aging');
    expect(keys(entry({ ageMs: 0 }))).not.toContain('stale');
  });

  it('tags large entries (>=1GB)', () => {
    expect(keys(entry({ sizeBytes: 2 * 1024 ** 3 }))).toContain('large');
    expect(keys(entry({ sizeBytes: 1024 }))).not.toContain('large');
  });

  it('tags docker entries as reclaimable', () => {
    expect(keys(entry({ category: 'docker', label: 'Docker' }))).toContain('reclaimable');
  });

  it('can stack multiple insights', () => {
    const k = keys(
      entry({ label: 'node_modules', ageMs: AGE_STALE_MS + 1, sizeBytes: 2 * 1024 ** 3 }),
    );
    expect(k).toEqual(expect.arrayContaining(['stale', 'rebuildable', 'large']));
  });
});
