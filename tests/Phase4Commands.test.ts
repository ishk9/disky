import { describe, it, expect, vi, afterEach } from 'vitest';
import { OptimizeCommand } from '../src/commands/OptimizeCommand';
import { UninstallCommand } from '../src/commands/UninstallCommand';
import type { IOptimizeStep, OptimizeResult } from '../src/optimize/IOptimizeStep';
import type { IOperationLog, OperationRecord } from '../src/core/OperationLog';
import type { IAppRegistry, InstalledApp, AppRemnant } from '../src/platform/IAppRegistry';
import type { IDirSizer, ChildSize } from '../src/platform/IDirSizer';
import type { DiskEntry } from '../src/types';
import { removalSuccess } from '../src/clean/ICleaner';

class FakeOpLog implements IOperationLog {
  records: Omit<OperationRecord, 'ts'>[] = [];
  record(entry: Omit<OperationRecord, 'ts'>): void {
    this.records.push(entry);
  }
  read(): OperationRecord[] {
    return [];
  }
}

class FakeStep implements IOptimizeStep {
  constructor(
    readonly key: string,
    readonly label: string,
    readonly description: string,
  ) {}
  run(): OptimizeResult {
    return { key: this.key, label: this.label, success: true };
  }
}

class FakeRegistry implements IAppRegistry {
  app: InstalledApp = {
    name: 'Example',
    bundleId: 'com.example.App',
    appPath: '/Applications/Example.app',
  };
  list(): InstalledApp[] {
    return [this.app];
  }
  find(): InstalledApp | null {
    return this.app;
  }
  remnants(): AppRemnant[] {
    return [{ path: '/Users/me/Library/Preferences/com.example.App.plist', kind: 'Preferences' }];
  }
}

class FakeSizer implements IDirSizer {
  async sizes(paths: string[]): Promise<Map<string, number>> {
    return new Map(paths.map((p) => [p, p.endsWith('.app') ? 200 : 50]));
  }
  async childSizes(): Promise<ChildSize[]> {
    return [];
  }
  childSizesSync(): ChildSize[] {
    return [];
  }
}

function capture(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => {
    chunks.push(String(c));
    return true;
  });
  const logSpy = vi.spyOn(console, 'log').mockImplementation((c?: any) => {
    chunks.push(String(c) + '\n');
  });
  return fn().then(() => {
    spy.mockRestore();
    logSpy.mockRestore();
    return chunks.join('');
  });
}

afterEach(() => vi.restoreAllMocks());

describe('OptimizeCommand', () => {
  it('dry-runs and records each selected step without running it', async () => {
    const log = new FakeOpLog();
    const step = new FakeStep('flush-dns', 'Flush DNS', 'Clears DNS cache');
    const out = await capture(() =>
      new OptimizeCommand({ dryRun: true, json: true }, [step], log).execute(),
    );

    expect(JSON.parse(out).dryRun).toBe(true);
    expect(log.records).toEqual([
      {
        op: 'optimize',
        label: 'flush-dns',
        path: 'flush-dns',
        bytes: 0,
        dryRun: true,
        success: true,
      },
    ]);
  });
});

describe('UninstallCommand', () => {
  it('defaults to a dry-run preview and records app/remnant previews', async () => {
    const log = new FakeOpLog();
    const cleanService = {
      clean: (entry: DiskEntry, opts: { dryRun?: boolean }, op: string) => {
        log.record({
          op,
          label: entry.artifactType.label,
          path: entry.absolutePath,
          bytes: 0,
          dryRun: Boolean(opts.dryRun),
          success: true,
        });
        return removalSuccess(entry);
      },
    };

    const out = await capture(() =>
      new UninstallCommand(
        { query: 'Example', json: true },
        new FakeRegistry(),
        cleanService as any,
        new FakeSizer(),
      ).execute(),
    );

    const parsed = JSON.parse(out);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.entries).toHaveLength(2);
    expect(log.records.map((r) => r.dryRun)).toEqual([true, true]);
  });

  it('executes removals before emitting JSON when execute is requested', async () => {
    const calls: Array<{ path: string; dryRun: boolean; op: string }> = [];
    const cleanService = {
      clean: (entry: DiskEntry, opts: { dryRun?: boolean }, op: string) => {
        calls.push({ path: entry.absolutePath, dryRun: Boolean(opts.dryRun), op });
        return removalSuccess(entry);
      },
    };

    const out = await capture(() =>
      new UninstallCommand(
        { query: 'Example', execute: true, json: true },
        new FakeRegistry(),
        cleanService as any,
        new FakeSizer(),
      ).execute(),
    );

    const parsed = JSON.parse(out);
    expect(parsed.dryRun).toBe(false);
    expect(parsed.results).toHaveLength(2);
    expect(calls).toEqual([
      { path: '/Applications/Example.app', dryRun: false, op: 'uninstall' },
      {
        path: '/Users/me/Library/Preferences/com.example.App.plist',
        dryRun: false,
        op: 'uninstall',
      },
    ]);
  });
});
