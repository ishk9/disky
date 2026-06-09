import { describe, it, expect } from 'vitest';
import { isExcluded } from '../src/core/EntryResolver';
import { DiskEntry } from '../src/types';

/** Helper to build a minimal DiskEntry for testing. */
function makeEntry(overrides: Partial<DiskEntry> = {}): DiskEntry {
  return {
    id: 1,
    sizeBytes: 1024,
    sizeHuman: '1 KB',
    artifactType: { label: 'node_modules', color: 'green', safeToClean: true },
    absolutePath: '/home/user/project/node_modules',
    displayPath: '~/project/node_modules',
    project: 'project',
    directory: '/home/user/project',
    gitBranch: null,
    ageMs: 0,
    ageHuman: '–',
    isDockerEntry: false,
    dockerSummary: null,
    topOffenders: [],
    ...overrides,
  };
}

describe('isExcluded', () => {
  it('returns false when no exclusions', () => {
    const entry = makeEntry();
    expect(isExcluded(entry, [])).toBe(false);
  });

  it('returns true for exact path match', () => {
    const entry = makeEntry({ absolutePath: '/home/user/project/node_modules' });
    expect(isExcluded(entry, ['/home/user/project/node_modules'])).toBe(true);
  });

  it('returns true when entry path is a child of an exclusion', () => {
    const entry = makeEntry({ absolutePath: '/home/user/project/node_modules' });
    expect(isExcluded(entry, ['/home/user/project'])).toBe(true);
  });

  it('returns false when exclusion is a child of entry path', () => {
    const entry = makeEntry({ absolutePath: '/home/user/project' });
    expect(isExcluded(entry, ['/home/user/project/node_modules'])).toBe(false);
  });

  it('returns false for partial prefix matches (no separator)', () => {
    // /home/user/proj should NOT exclude /home/user/project/node_modules
    const entry = makeEntry({ absolutePath: '/home/user/project/node_modules' });
    expect(isExcluded(entry, ['/home/user/proj'])).toBe(false);
  });

  it('always returns false for Docker entries', () => {
    const entry = makeEntry({
      absolutePath: '__docker__',
      isDockerEntry: true,
    });
    expect(isExcluded(entry, ['__docker__'])).toBe(false);
    expect(isExcluded(entry, ['/anything'])).toBe(false);
  });

  it('checks all exclusions (matches any)', () => {
    const entry = makeEntry({ absolutePath: '/home/user/project/node_modules' });
    expect(isExcluded(entry, ['/unrelated', '/home/user/project/node_modules'])).toBe(true);
  });

  it('returns false when no exclusion matches', () => {
    const entry = makeEntry({ absolutePath: '/home/user/project/node_modules' });
    expect(isExcluded(entry, ['/other/path', '/another/path'])).toBe(false);
  });
});
