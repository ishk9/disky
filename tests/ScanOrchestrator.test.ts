import { describe, it, expect } from 'vitest';
import { ScanOrchestrator } from '../src/scan/ScanOrchestrator';
import { DiskScanner } from '../src/core/DiskScanner';
import type { IScanProvider } from '../src/scan/IScanProvider';
import type { IDirSizer, ChildSize } from '../src/platform/IDirSizer';
import type { IFileFinder, FindDirsOptions, LargeDirsOptions } from '../src/platform/IFileFinder';
import type { IDockerClient, DockerStats } from '../src/platform/IDockerClient';
import type { PlatformServices } from '../src/platform/macos';
import type { DiskEntry, EntryCategory } from '../src/types';
import type { ScanProgress } from '../src/interfaces/IScanner';

function fakeEntry(
  path: string,
  sizeBytes: number,
  category: EntryCategory = 'artifact',
): DiskEntry {
  return {
    id: 0,
    category,
    sizeBytes,
    sizeHuman: `${sizeBytes}`,
    artifactType: { label: 'x', color: 'gray', safeToClean: true, cleanPolicy: 'auto' },
    absolutePath: path,
    displayPath: path,
    project: null,
    directory: null,
    gitBranch: null,
    ageMs: 0,
    ageHuman: '–',
    isDockerEntry: path === '__docker__',
    dockerSummary: null,
    topOffenders: [],
  };
}

function provider(category: EntryCategory, entries: DiskEntry[]): IScanProvider {
  return { category, scan: async () => entries };
}

describe('ScanOrchestrator', () => {
  it('merges providers, assigns ids in discovery order, and sorts by size', async () => {
    const a = provider('artifact', [fakeEntry('/a', 100), fakeEntry('/b', 300)]);
    const d = provider('docker', [fakeEntry('__docker__', 200, 'docker')]);

    const result = await new ScanOrchestrator([a, d]).scan();

    // Sorted by size desc.
    expect(result.map((e) => e.absolutePath)).toEqual(['/b', '__docker__', '/a']);
    // IDs assigned in discovery order (/a=1, /b=2, docker=3), independent of sort.
    expect(result.find((e) => e.absolutePath === '/a')!.id).toBe(1);
    expect(result.find((e) => e.absolutePath === '/b')!.id).toBe(2);
    expect(result.find((e) => e.absolutePath === '__docker__')!.id).toBe(3);
  });

  it('dedupes by absolute path but keeps docker pseudo-entries', async () => {
    const a = provider('artifact', [fakeEntry('/dup', 100)]);
    const b = provider('large-file', [
      fakeEntry('/dup', 100, 'large-file'),
      fakeEntry('/x', 50, 'large-file'),
    ]);
    const result = await new ScanOrchestrator([a, b]).scan();
    expect(result.filter((e) => e.absolutePath === '/dup')).toHaveLength(1);
    expect(result.map((e) => e.absolutePath).sort()).toEqual(['/dup', '/x']);
  });
});

// ─── Fakes for the full DiskScanner pipeline ─────────────────────────────────

class FakeDirSizer implements IDirSizer {
  constructor(private readonly preset: Record<string, number>) {}
  async sizes(
    paths: string[],
    onSized?: (p: string, b: number) => void,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (const p of paths) {
      const bytes = this.preset[p] ?? 0;
      out.set(p, bytes);
      onSized?.(p, bytes);
    }
    return out;
  }
  async childSizes(): Promise<ChildSize[]> {
    return [];
  }
  childSizesSync(): ChildSize[] {
    return [];
  }
}

class FakeFileFinder implements IFileFinder {
  constructor(private readonly dirs: string[]) {}
  findDirsByName(_root: string, _names: string[], _opts: FindDirsOptions): string[] {
    return this.dirs;
  }
  largeDirs(_root: string, _opts: LargeDirsOptions): Array<[string, number]> {
    return this.dirs.map((d) => [d, 99]);
  }
}

class FakeDocker implements IDockerClient {
  constructor(private readonly s: DockerStats | null) {}
  isAvailable(): boolean {
    return this.s !== null;
  }
  stats(): DockerStats | null {
    return this.s;
  }
  prune(): boolean {
    return true;
  }
}

describe('DiskScanner (facade over providers)', () => {
  it('builds entries from injected platform services and reports progress', async () => {
    const nm = '/proj/node_modules';
    const platform: PlatformServices = {
      fileFinder: new FakeFileFinder([nm]),
      dirSizer: new FakeDirSizer({ [nm]: 5000 }),
      dockerClient: new FakeDocker(null),
    };

    const progress: ScanProgress[] = [];
    const entries = await new DiskScanner(platform).scan(true, {
      includeTopOffenders: false,
      onProgress: (p) => progress.push(p),
    });

    const found = entries.find((e) => e.absolutePath === nm);
    expect(found).toBeDefined();
    expect(found!.sizeBytes).toBe(5000);
    expect(found!.category).toBe('artifact');
    expect(progress.some((p) => p.phase === 'size' && p.scanned > 0)).toBe(true);
  });

  it('excludes zero-size paths', async () => {
    const platform: PlatformServices = {
      fileFinder: new FakeFileFinder(['/empty/node_modules']),
      dirSizer: new FakeDirSizer({}), // all zero
      dockerClient: new FakeDocker(null),
    };
    const entries = await new DiskScanner(platform).scan(true, { includeTopOffenders: false });
    expect(entries.find((e) => e.absolutePath === '/empty/node_modules')).toBeUndefined();
  });
});
