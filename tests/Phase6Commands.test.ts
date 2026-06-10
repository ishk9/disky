import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { HistoryCommand } from '../src/commands/HistoryCommand';
import { CompletionCommand } from '../src/commands/CompletionCommand';
import { TouchIdCommand } from '../src/commands/TouchIdCommand';
import { UpdateCommand } from '../src/commands/UpdateCommand';
import { WhitelistCommand } from '../src/commands/WhitelistCommand';
import { Config } from '../src/core/Config';
import type { IOperationLog, OperationRecord } from '../src/core/OperationLog';
import type { ISudoRunner } from '../src/platform/ISudoRunner';

class FakeLog implements IOperationLog {
  constructor(private readonly records: OperationRecord[]) {}
  record(): void {}
  read(limit?: number): OperationRecord[] {
    return limit === undefined ? this.records : this.records.slice(0, limit);
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

describe('HistoryCommand', () => {
  it('emits newest operation records as JSON with limit', async () => {
    const records: OperationRecord[] = [
      {
        ts: '2026-06-09T01:00:00.000Z',
        op: 'sweep',
        label: 'Caches',
        path: '/a',
        bytes: 100,
        dryRun: false,
        success: true,
      },
      {
        ts: '2026-06-09T00:00:00.000Z',
        op: 'clean',
        label: 'node_modules',
        path: '/b',
        bytes: 200,
        dryRun: false,
        success: true,
      },
    ];

    const out = await capture(() =>
      new HistoryCommand({ json: true, limit: 1 }, new FakeLog(records)).execute(),
    );

    const parsed = JSON.parse(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].op).toBe('sweep');
  });
});

describe('CompletionCommand', () => {
  it('prints a zsh completion that includes phase 4-6 commands', async () => {
    const out = await capture(() => new CompletionCommand({ shell: 'zsh' }).execute());
    expect(out).toContain('_arguments');
    expect(out).toContain('uninstall');
    expect(out).toContain('touchid');
    expect(out).toContain('update');
  });
});

describe('WhitelistCommand', () => {
  it('adds, lists, and removes protected patterns', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disky-whitelist-command-'));
    const config = new Config(path.join(dir, 'config.json'), '/Users/tester');

    try {
      await capture(() =>
        new WhitelistCommand(
          { action: 'add', category: 'app', pattern: 'com.example.App', json: true },
          config,
        ).execute(),
      );
      let out = await capture(() =>
        new WhitelistCommand({ action: 'list', category: 'app', json: true }, config).execute(),
      );
      expect(JSON.parse(out).app).toEqual(['com.example.App']);

      await capture(() =>
        new WhitelistCommand(
          { action: 'remove', category: 'app', pattern: 'com.example.App', json: true },
          config,
        ).execute(),
      );
      out = await capture(() =>
        new WhitelistCommand({ action: 'list', category: 'app', json: true }, config).execute(),
      );
      expect(JSON.parse(out).app).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

class FakeSudoRunner implements ISudoRunner {
  content: string | null = null;
  writes: string[] = [];
  removed = false;

  readFile(): string | null {
    return this.content;
  }

  writeFile(_path: string, content: string): boolean {
    this.content = content;
    this.writes.push(content);
    return true;
  }

  removeFile(): boolean {
    this.content = null;
    this.removed = true;
    return true;
  }
}

describe('TouchIdCommand', () => {
  it('dry-runs enable without writing sudo_local', async () => {
    const runner = new FakeSudoRunner();
    const out = await capture(() =>
      new TouchIdCommand({ action: 'enable', dryRun: true }, runner).execute(),
    );

    expect(out).toContain('[DRY RUN]');
    expect(runner.writes).toEqual([]);
  });

  it('enables and disables pam_tid idempotently', async () => {
    const runner = new FakeSudoRunner();

    await capture(() => new TouchIdCommand({ action: 'enable' }, runner).execute());
    await capture(() => new TouchIdCommand({ action: 'enable' }, runner).execute());
    expect(runner.content?.match(/pam_tid\.so/g)).toHaveLength(1);

    await capture(() => new TouchIdCommand({ action: 'disable' }, runner).execute());
    expect(activePamTidLines(runner.content ?? '')).toHaveLength(0);
  });

  it('treats commented pam_tid lines as disabled when enabling', async () => {
    const runner = new FakeSudoRunner();
    runner.content = '# auth       sufficient     pam_tid.so\n';

    await capture(() => new TouchIdCommand({ action: 'enable' }, runner).execute());

    expect(runner.writes).toHaveLength(1);
    expect(runner.content).toContain('# auth       sufficient     pam_tid.so');
    expect(activePamTidLines(runner.content ?? '')).toHaveLength(1);
  });

  it('preserves commented pam_tid lines when disabling', async () => {
    const runner = new FakeSudoRunner();
    runner.content =
      '# auth       sufficient     pam_tid.so\n' + 'auth       sufficient     pam_tid.so\n';

    await capture(() => new TouchIdCommand({ action: 'disable' }, runner).execute());

    expect(runner.removed).toBe(false);
    expect(runner.content).toContain('# auth       sufficient     pam_tid.so');
    expect(activePamTidLines(runner.content ?? '')).toHaveLength(0);
  });
});

function activePamTidLines(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && line.includes('pam_tid.so'));
}

describe('UpdateCommand', () => {
  it('uses npm global install with latest or next tags', async () => {
    const calls: string[][] = [];
    const runner = {
      run: (cmd: string, args: string[]) => {
        calls.push([cmd, ...args]);
        return true;
      },
    };

    await capture(() => new UpdateCommand({ nightly: false }, runner).execute());
    await capture(() => new UpdateCommand({ nightly: true }, runner).execute());

    expect(calls[0]).toEqual(['npm', 'i', '-g', '@ishk9/disky@latest']);
    expect(calls[1]).toEqual(['npm', 'i', '-g', '@ishk9/disky@next']);
  });
});
