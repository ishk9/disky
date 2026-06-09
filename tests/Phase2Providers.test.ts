import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DirectoryScanProvider } from '../src/scan/DirectoryScanProvider';
import { InstallerScanProvider } from '../src/scan/InstallerScanProvider';
import { makeEntry } from '../src/scan/makeEntry';
import { diskUsage } from '../src/system/diskUsage';
import type { IDirSizer, ChildSize } from '../src/platform/IDirSizer';

class FakeDirSizer implements IDirSizer {
  constructor(private readonly preset: Record<string, number>) {}
  async sizes(
    paths: string[],
    onSized?: (p: string, b: number) => void,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (const p of paths) {
      const b = this.preset[p] ?? 0;
      out.set(p, b);
      onSized?.(p, b);
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

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disky-p2-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('DirectoryScanProvider', () => {
  it('builds entries for children above minBytes with the source policy', async () => {
    const root = path.join(dir, 'Caches');
    fs.mkdirSync(path.join(root, 'big'), { recursive: true });
    fs.mkdirSync(path.join(root, 'tiny'), { recursive: true });
    const sizer = new FakeDirSizer({
      [path.join(root, 'big')]: 5 * 1024 * 1024,
      [path.join(root, 'tiny')]: 100,
    });

    const provider = new DirectoryScanProvider(
      'system-cache',
      [{ roots: [root], mode: 'children', color: 'gray', policy: 'auto', minBytes: 1024 * 1024 }],
      sizer,
    );
    const entries = await provider.scan({});

    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('system-cache');
    expect(entries[0].artifactType.label).toBe('big');
    expect(entries[0].artifactType.cleanPolicy).toBe('auto');
  });

  it("'self' mode emits the root itself as one entry", async () => {
    const trash = path.join(dir, '.Trash');
    fs.mkdirSync(trash);
    const sizer = new FakeDirSizer({ [trash]: 2048 });
    const provider = new DirectoryScanProvider(
      'trash',
      [{ roots: [trash], mode: 'self', color: 'gray', policy: 'auto', label: 'Trash' }],
      sizer,
    );
    const entries = await provider.scan({});
    expect(entries).toHaveLength(1);
    expect(entries[0].artifactType.label).toBe('Trash');
    expect(entries[0].absolutePath).toBe(trash);
  });

  it('skips missing roots gracefully', async () => {
    const provider = new DirectoryScanProvider(
      'log',
      [{ roots: [path.join(dir, 'nope')], mode: 'self', color: 'gray', policy: 'auto' }],
      new FakeDirSizer({}),
    );
    expect(await provider.scan({})).toEqual([]);
  });
});

describe('InstallerScanProvider', () => {
  it('picks up installer extensions and ignores others', async () => {
    fs.writeFileSync(path.join(dir, 'app.dmg'), 'x'.repeat(2048));
    fs.writeFileSync(path.join(dir, 'tool.pkg'), 'y'.repeat(1024));
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'nope');

    const entries = await new InstallerScanProvider([dir]).scan({});
    const names = entries.map((e) => path.basename(e.absolutePath)).sort();

    expect(names).toEqual(['app.dmg', 'tool.pkg']);
    expect(entries.every((e) => e.category === 'installer')).toBe(true);
    expect(entries.every((e) => e.artifactType.cleanPolicy === 'auto')).toBe(true);
    const dmg = entries.find((e) => e.absolutePath.endsWith('.dmg'))!;
    expect(dmg.sizeBytes).toBe(2048);
  });
});

describe('makeEntry', () => {
  it('preserves the provided policy for non-protected paths and computes age', () => {
    const p = path.join(dir, 'cache');
    fs.mkdirSync(p);
    const entry = makeEntry({
      absPath: p,
      sizeBytes: 1234,
      category: 'system-cache',
      artifactType: { label: 'cache', color: 'gray', safeToClean: true, cleanPolicy: 'auto' },
    });
    expect(entry.artifactType.cleanPolicy).toBe('auto');
    expect(entry.sizeHuman).toBe('1 KB');
    expect(entry.category).toBe('system-cache');
  });
});

describe('diskUsage', () => {
  it('returns sane totals for the root volume', () => {
    const u = diskUsage('/');
    expect(u).not.toBeNull();
    expect(u!.totalBytes).toBeGreaterThan(0);
    expect(u!.usedBytes + u!.freeBytes).toBeCloseTo(u!.totalBytes, -6);
    expect(u!.usedFraction).toBeGreaterThanOrEqual(0);
    expect(u!.usedFraction).toBeLessThanOrEqual(1);
  });
});
