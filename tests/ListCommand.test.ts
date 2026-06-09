import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListCommand } from '../src/commands/ListCommand';
import { IScanner } from '../src/interfaces/IScanner';
import { DiskEntry } from '../src/types';

/** Creates a mock scanner that returns the given entries. */
function mockScanner(entries: DiskEntry[]): IScanner {
  return {
    scan: vi.fn().mockResolvedValue(entries),
  };
}

/** Builds a minimal DiskEntry for testing. */
function entry(overrides: Partial<DiskEntry>): DiskEntry {
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
    ageMs: 1000,
    ageHuman: 'just now',
    isDockerEntry: false,
    dockerSummary: null,
    topOffenders: [],
    ...overrides,
  };
}

describe('ListCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls scanner.scan with artifactOnly flag', async () => {
    const scanner = mockScanner([]);
    const cmd = new ListCommand({ artifactOnly: true }, scanner);
    await cmd.execute();
    expect(scanner.scan).toHaveBeenCalledWith(true, { includeTopOffenders: false });
  });

  it('passes artifactOnly=false when --all is used', async () => {
    const scanner = mockScanner([]);
    const cmd = new ListCommand({ artifactOnly: false }, scanner);
    await cmd.execute();
    expect(scanner.scan).toHaveBeenCalledWith(false, { includeTopOffenders: false });
  });

  it('keeps top offender data for JSON output', async () => {
    const scanner = mockScanner([]);
    const cmd = new ListCommand({ artifactOnly: true, json: true }, scanner);
    await cmd.execute();
    expect(scanner.scan).toHaveBeenCalledWith(true, { includeTopOffenders: true });
  });

  it('filters entries below minBytes', async () => {
    const entries = [
      entry({ id: 1, sizeBytes: 500 * 1024 ** 2, sizeHuman: '500 MB', absolutePath: '/a' }),
      entry({ id: 2, sizeBytes: 50 * 1024 ** 2, sizeHuman: '50 MB', absolutePath: '/b' }),
      entry({ id: 3, sizeBytes: 10 * 1024 ** 2, sizeHuman: '10 MB', absolutePath: '/c' }),
    ];
    const scanner = mockScanner(entries);
    // Use JSON mode so we can inspect exactly which entries survive the filter
    const cmd = new ListCommand(
      { artifactOnly: true, minBytes: 100 * 1024 ** 2, json: true },
      scanner,
    );
    await cmd.execute();

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    // Only the 500 MB entry is at or above the 100 MB threshold
    expect(parsed).toHaveLength(1);
    expect(parsed[0].sizeBytes).toBe(500 * 1024 ** 2);
  });

  it('shows "No disk hogs found" when no entries match', async () => {
    const scanner = mockScanner([]);
    const cmd = new ListCommand({ artifactOnly: true }, scanner);
    await cmd.execute();

    const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allOutput).toContain('No disk hogs found');
  });

  it('outputs JSON when json option is set', async () => {
    const entries = [
      entry({ id: 1, sizeBytes: 1024 ** 3, sizeHuman: '1.0 GB', absolutePath: '/a' }),
    ];
    const scanner = mockScanner(entries);
    const cmd = new ListCommand({ artifactOnly: true, json: true }, scanner);
    await cmd.execute();

    // JSON mode uses process.stdout.write, not console.log
    expect(stdoutSpy).toHaveBeenCalled();
    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].sizeHuman).toBe('1.0 GB');
  });

  it('limits output with --top flag', async () => {
    const entries = [
      entry({ id: 1, sizeBytes: 300 * 1024 ** 2, absolutePath: '/a' }),
      entry({ id: 2, sizeBytes: 200 * 1024 ** 2, absolutePath: '/b' }),
      entry({ id: 3, sizeBytes: 100 * 1024 ** 2, absolutePath: '/c' }),
    ];
    const scanner = mockScanner(entries);
    const cmd = new ListCommand({ artifactOnly: true, json: true, top: 2 }, scanner);
    await cmd.execute();

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(2);
  });

  it('sorts by size by default (largest first)', async () => {
    const entries = [
      entry({ id: 1, sizeBytes: 100 * 1024 ** 2, absolutePath: '/small' }),
      entry({ id: 2, sizeBytes: 1000 * 1024 ** 2, absolutePath: '/big' }),
      entry({ id: 3, sizeBytes: 500 * 1024 ** 2, absolutePath: '/medium' }),
    ];
    const scanner = mockScanner(entries);
    const cmd = new ListCommand({ artifactOnly: true, json: true }, scanner);
    await cmd.execute();

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed[0].absolutePath).toBe('/big');
    expect(parsed[1].absolutePath).toBe('/medium');
    expect(parsed[2].absolutePath).toBe('/small');
  });

  it('sorts by age when sortMode is "age"', async () => {
    const entries = [
      entry({ id: 1, ageMs: 1000, absolutePath: '/new' }),
      entry({ id: 2, ageMs: 50000, absolutePath: '/old' }),
      entry({ id: 3, ageMs: 25000, absolutePath: '/mid' }),
    ];
    const scanner = mockScanner(entries);
    const cmd = new ListCommand({ artifactOnly: true, json: true, sortMode: 'age' }, scanner);
    await cmd.execute();

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    // Oldest first
    expect(parsed[0].absolutePath).toBe('/old');
    expect(parsed[1].absolutePath).toBe('/mid');
    expect(parsed[2].absolutePath).toBe('/new');
  });

  it('sorts by type when sortMode is "type"', async () => {
    const entries = [
      entry({
        id: 1,
        absolutePath: '/z',
        artifactType: { label: 'node_modules', color: 'green', safeToClean: true },
        sizeBytes: 100 * 1024 ** 2,
      }),
      entry({
        id: 2,
        absolutePath: '/a',
        artifactType: { label: '.next', color: 'cyan', safeToClean: true },
        sizeBytes: 200 * 1024 ** 2,
      }),
      entry({
        id: 3,
        absolutePath: '/b',
        artifactType: { label: '.next', color: 'cyan', safeToClean: true },
        sizeBytes: 300 * 1024 ** 2,
      }),
    ];
    const scanner = mockScanner(entries);
    const cmd = new ListCommand({ artifactOnly: true, json: true, sortMode: 'type' }, scanner);
    await cmd.execute();

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    // .next group first (alphabetical), then node_modules
    // Within .next, sorted by size descending
    expect(parsed[0].artifactType.label).toBe('.next');
    expect(parsed[0].sizeBytes).toBe(300 * 1024 ** 2);
    expect(parsed[1].artifactType.label).toBe('.next');
    expect(parsed[1].sizeBytes).toBe(200 * 1024 ** 2);
    expect(parsed[2].artifactType.label).toBe('node_modules');
  });

  it('reassigns sequential IDs after sorting', async () => {
    const entries = [
      entry({ id: 99, sizeBytes: 100 * 1024 ** 2, absolutePath: '/a' }),
      entry({ id: 77, sizeBytes: 1000 * 1024 ** 2, absolutePath: '/b' }),
    ];
    const scanner = mockScanner(entries);
    const cmd = new ListCommand({ artifactOnly: true, json: true }, scanner);
    await cmd.execute();

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed[0].id).toBe(1);
    expect(parsed[1].id).toBe(2);
  });
});
