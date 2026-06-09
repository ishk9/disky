import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CleanCommand } from '../src/commands/CleanCommand';
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
    sizeBytes: 100 * 1024 ** 2,
    sizeHuman: '100 MB',
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

describe('CleanCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dry-run mode', () => {
    it('shows dry-run message for bulk cleanup', async () => {
      const entries = [
        entry({ id: 1, absolutePath: '/a/node_modules' }),
        entry({ id: 2, absolutePath: '/b/node_modules' }),
      ];
      const scanner = mockScanner(entries);
      const cmd = new CleanCommand({ dryRun: true }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('DRY RUN');
      expect(allOutput).toContain('No files were modified');
    });

    it('shows dry-run message for specific entry', async () => {
      const entries = [entry({ id: 1, absolutePath: '/a/node_modules' })];
      const scanner = mockScanner(entries);
      // Use targetPath instead of id — avoids dependency on filesystem cache state
      const cmd = new CleanCommand({ targetPath: '/a/node_modules', dryRun: true }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('DRY RUN');
      expect(allOutput).toContain('No files were modified');
    });
  });

  describe('entry resolution', () => {
    it('shows error when entry ID is not found', async () => {
      const scanner = mockScanner([]);
      const cmd = new CleanCommand({ id: 999 }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('No entry found for ID 999');
    });

    it('shows error when target path is not found', async () => {
      const scanner = mockScanner([]);
      const cmd = new CleanCommand({ targetPath: '/nonexistent' }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('No entry found');
    });
  });

  describe('bulk cleanup filtering', () => {
    it('only includes safeToClean entries in bulk mode', async () => {
      const entries = [
        entry({
          id: 1,
          absolutePath: '/a',
          artifactType: { label: 'node_modules', color: 'green', safeToClean: true },
        }),
        entry({
          id: 2,
          absolutePath: '/b',
          artifactType: { label: 'unknown', color: 'gray', safeToClean: false },
        }),
      ];
      const scanner = mockScanner(entries);
      const cmd = new CleanCommand({ dryRun: true }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      // Should mention only 1 entry in the dry-run summary
      expect(allOutput).toContain('1 entry');
    });

    it('reports excluded entries count', async () => {
      // This test verifies the exclusion display logic.
      // We use CLI excludePaths which get resolved via expandPath.
      const entries = [
        entry({ id: 1, absolutePath: '/home/user/project/node_modules' }),
        entry({ id: 2, absolutePath: '/home/user/other/node_modules' }),
      ];
      const scanner = mockScanner(entries);
      const cmd = new CleanCommand(
        {
          dryRun: true,
          excludePaths: ['/home/user/project/node_modules'],
        },
        scanner,
      );
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('Skipping 1 excluded entry');
    });

    it('skips locked entries in bulk mode', async () => {
      const entries = [
        entry({
          id: 1,
          absolutePath: '/auto/node_modules',
          artifactType: {
            label: 'node_modules',
            color: 'green',
            safeToClean: true,
            cleanPolicy: 'auto',
          },
        }),
        entry({
          id: 2,
          absolutePath: '/locked/node_modules',
          artifactType: {
            label: 'node_modules',
            color: 'green',
            safeToClean: false,
            cleanPolicy: 'locked',
            cleanReason: 'toolchain install',
          },
        }),
      ];
      const scanner = mockScanner(entries);
      const cmd = new CleanCommand({ dryRun: true }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('1 locked');
      expect(allOutput).toContain('Would remove 1 entry');
    });

    it('rejects bulk force cleanup', async () => {
      const scanner = mockScanner([]);
      const cmd = new CleanCommand({ force: true }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('Bulk force cleanup is not supported');
    });
  });

  describe('locked target cleanup', () => {
    it('blocks locked targets without force', async () => {
      const entries = [
        entry({
          id: 1,
          absolutePath: '/locked/node_modules',
          artifactType: {
            label: 'node_modules',
            color: 'green',
            safeToClean: false,
            cleanPolicy: 'locked',
            cleanReason: 'toolchain install',
          },
        }),
      ];
      const scanner = mockScanner(entries);
      const cmd = new CleanCommand({ targetPath: '/locked/node_modules' }, scanner);
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('Locked entry');
      expect(allOutput).toContain('--force');
    });

    it('dry-runs locked targets with force', async () => {
      const entries = [
        entry({
          id: 1,
          absolutePath: '/locked/node_modules',
          artifactType: {
            label: 'node_modules',
            color: 'green',
            safeToClean: false,
            cleanPolicy: 'locked',
            cleanReason: 'toolchain install',
          },
        }),
      ];
      const scanner = mockScanner(entries);
      const cmd = new CleanCommand(
        { targetPath: '/locked/node_modules', dryRun: true, force: true },
        scanner,
      );
      await cmd.execute();

      const allOutput = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(allOutput).toContain('Would force delete node_modules');
      expect(allOutput).toContain('No files were modified');
    });
  });
});
