import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { OperationLog } from '../src/core/OperationLog';

describe('OperationLog', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disky-oplog-'));
    file = path.join(dir, 'operations.log');
    delete process.env.DISKY_NO_OPLOG;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.DISKY_NO_OPLOG;
  });

  it('records and reads back operations newest-first', () => {
    const log = new OperationLog(file);
    log.record({
      op: 'clean',
      label: 'node_modules',
      path: '/a',
      bytes: 100,
      dryRun: false,
      success: true,
    });
    log.record({
      op: 'clean',
      label: '.next',
      path: '/b',
      bytes: 200,
      dryRun: false,
      success: true,
    });

    const records = log.read();
    expect(records).toHaveLength(2);
    expect(records[0].path).toBe('/b'); // newest first
    expect(records[1].path).toBe('/a');
    expect(records[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('honors the limit argument', () => {
    const log = new OperationLog(file);
    for (let i = 0; i < 5; i++) {
      log.record({
        op: 'clean',
        label: 'x',
        path: `/p${i}`,
        bytes: i,
        dryRun: false,
        success: true,
      });
    }
    expect(log.read(2)).toHaveLength(2);
  });

  it('is a no-op when DISKY_NO_OPLOG=1', () => {
    process.env.DISKY_NO_OPLOG = '1';
    const log = new OperationLog(file);
    log.record({ op: 'clean', label: 'x', path: '/p', bytes: 1, dryRun: false, success: true });
    expect(fs.existsSync(file)).toBe(false);
    expect(log.read()).toEqual([]);
  });

  it('returns an empty array when the log does not exist', () => {
    expect(new OperationLog(path.join(dir, 'missing.log')).read()).toEqual([]);
  });
});
