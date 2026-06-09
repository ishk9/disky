import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CleanService } from '../src/clean/CleanService';
import { FilesystemCleaner } from '../src/clean/FilesystemCleaner';
import { DockerCleaner } from '../src/clean/DockerCleaner';
import type { ICleaner, RemovalResult } from '../src/clean/ICleaner';
import { removalSuccess, removalFailure } from '../src/clean/ICleaner';
import type { IOperationLog, OperationRecord } from '../src/core/OperationLog';
import type { CleanPolicy, DiskEntry } from '../src/types';

function makeEntry(overrides: Partial<DiskEntry> & { policy?: CleanPolicy } = {}): DiskEntry {
  const policy = overrides.policy ?? 'auto';
  return {
    id: 1,
    sizeBytes: 1024,
    sizeHuman: '1 KB',
    artifactType: {
      label: overrides.artifactType?.label ?? 'node_modules',
      color: 'green',
      safeToClean: policy === 'auto',
      cleanPolicy: policy,
    },
    absolutePath: overrides.absolutePath ?? '/tmp/x',
    displayPath: overrides.displayPath ?? '~/x',
    project: null,
    directory: null,
    gitBranch: null,
    ageMs: 0,
    ageHuman: '–',
    isDockerEntry: overrides.isDockerEntry ?? false,
    dockerSummary: null,
    topOffenders: [],
    ...overrides,
  } as DiskEntry;
}

class FakeOpLog implements IOperationLog {
  records: Omit<OperationRecord, 'ts'>[] = [];
  record(entry: Omit<OperationRecord, 'ts'>): void {
    this.records.push(entry);
  }
  read(): OperationRecord[] {
    return [];
  }
}

describe('CleanService', () => {
  it('dispatches to the first cleaner that can handle the entry and logs the op', () => {
    const oplog = new FakeOpLog();
    const fsCleaner: ICleaner = {
      name: 'fake-fs',
      canClean: (e) => !e.isDockerEntry,
      clean: (e) => removalSuccess(e),
    };
    const service = new CleanService([fsCleaner], oplog);

    const result = service.clean(makeEntry({ absolutePath: '/tmp/y' }));

    expect(result.success).toBe(true);
    expect(result.bytesFreed).toBe(1024);
    expect(oplog.records).toHaveLength(1);
    expect(oplog.records[0]).toMatchObject({ op: 'clean', path: '/tmp/y', success: true });
  });

  it('records a failure when no cleaner handles the entry', () => {
    const oplog = new FakeOpLog();
    const service = new CleanService([], oplog);
    const result = service.clean(makeEntry());
    expect(result.success).toBe(false);
    expect(oplog.records[0]).toMatchObject({ success: false, bytes: 0 });
  });

  it('passes the custom op label through to the log', () => {
    const oplog = new FakeOpLog();
    const cleaner: ICleaner = { name: 'x', canClean: () => true, clean: (e) => removalFailure(e) };
    new CleanService([cleaner], oplog).clean(makeEntry(), {}, 'sweep');
    expect(oplog.records[0].op).toBe('sweep');
  });
});

describe('FilesystemCleaner', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disky-clean-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('only handles non-Docker entries', () => {
    const c = new FilesystemCleaner();
    expect(c.canClean(makeEntry())).toBe(true);
    expect(c.canClean(makeEntry({ isDockerEntry: true }))).toBe(false);
  });

  it('removes an auto-cleanable directory', () => {
    const target = path.join(dir, 'node_modules');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'f'), 'x');

    const result: RemovalResult = new FilesystemCleaner().clean(
      makeEntry({ policy: 'auto', absolutePath: target }),
      {},
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(target)).toBe(false);
  });

  it('refuses a locked directory without force, and removes it with force', () => {
    const target = path.join(dir, 'locked');
    fs.mkdirSync(target);

    const cleaner = new FilesystemCleaner();
    const denied = cleaner.clean(makeEntry({ policy: 'locked', absolutePath: target }), {});
    expect(denied.success).toBe(false);
    expect(fs.existsSync(target)).toBe(true);

    const forced = cleaner.clean(makeEntry({ policy: 'locked', absolutePath: target }), {
      force: true,
    });
    expect(forced.success).toBe(true);
    expect(fs.existsSync(target)).toBe(false);
  });
});

describe('DockerCleaner', () => {
  it('only handles Docker entries and delegates to the client', () => {
    let pruned = false;
    const fakeDocker = {
      isAvailable: () => true,
      stats: () => null,
      prune: () => {
        pruned = true;
        return true;
      },
    };
    const cleaner = new DockerCleaner(fakeDocker);
    expect(cleaner.canClean(makeEntry({ isDockerEntry: true }))).toBe(true);
    expect(cleaner.canClean(makeEntry())).toBe(false);

    const result = cleaner.clean(makeEntry({ isDockerEntry: true }), {});
    expect(pruned).toBe(true);
    expect(result.success).toBe(true);
  });
});
