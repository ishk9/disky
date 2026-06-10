import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Config } from '../src/core/Config';
import { isWhitelisted } from '../src/core/EntryResolver';
import type { DiskEntry } from '../src/types';

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disky-config-'));
  file = path.join(dir, 'config.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Config whitelist', () => {
  it('loads excludes and category whitelist patterns from disk', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({
        exclude: ['~/keep'],
        whitelist: {
          all: ['~/Library/DoNotTouch'],
          app: ['com.example.App'],
        },
      }),
    );

    const config = new Config(file, '/Users/tester');

    expect(config.getExclusions()).toEqual(['/Users/tester/keep']);
    expect(config.getWhitelist('app')).toEqual([
      '/Users/tester/Library/DoNotTouch',
      'com.example.App',
    ]);
  });

  it('adds and removes whitelist patterns without duplicating them', () => {
    const config = new Config(file, '/Users/tester');

    config.addWhitelist('trash', '~/.Trash/keep');
    config.addWhitelist('trash', '~/.Trash/keep');
    config.addWhitelist('trash', '/tmp/other');
    config.removeWhitelist('trash', '~/.Trash/keep');

    expect(config.getWhitelist('trash')).toEqual(['/tmp/other']);
  });

  it('matches whitelist patterns against entry paths, labels, and categories', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({
        whitelist: {
          all: ['/Users/tester/Library/Caches/Keep*'],
          app: ['com.example.App'],
        },
      }),
    );
    const config = new Config(file, '/Users/tester');
    const cacheEntry = makeEntry({
      category: 'system-cache',
      absolutePath: '/Users/tester/Library/Caches/KeepThis',
      artifactType: { label: 'KeepThis', color: 'gray', safeToClean: true, cleanPolicy: 'auto' },
    });
    const appEntry = makeEntry({
      category: 'app',
      absolutePath: '/Applications/Example.app',
      artifactType: {
        label: 'com.example.App',
        color: 'magenta',
        safeToClean: true,
        cleanPolicy: 'auto',
      },
    });

    expect(isWhitelisted(cacheEntry, config)).toBe(true);
    expect(isWhitelisted(appEntry, config)).toBe(true);
  });

  it('normalizes path-like CLI whitelist patterns before matching', () => {
    vi.stubEnv('HOME', dir);
    const cwd = process.cwd();
    const project = path.join(dir, 'project');
    fs.mkdirSync(project);
    const realProject = fs.realpathSync(project);
    process.chdir(realProject);
    try {
      const config = new Config(file, dir);
      const entry = makeEntry({
        category: 'artifact',
        absolutePath: path.join(realProject, 'node_modules'),
        displayPath: path.join(realProject, 'node_modules'),
      });

      expect(isWhitelisted(entry, config, ['./node_modules'])).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});

function makeEntry(overrides: Partial<DiskEntry>): DiskEntry {
  return {
    id: 1,
    category: 'artifact',
    sizeBytes: 1,
    sizeHuman: '1 B',
    artifactType: { label: 'x', color: 'gray', safeToClean: true, cleanPolicy: 'auto' },
    absolutePath: '/tmp/x',
    displayPath: '/tmp/x',
    project: null,
    directory: null,
    gitBranch: null,
    ageMs: 0,
    ageHuman: '-',
    isDockerEntry: false,
    dockerSummary: null,
    topOffenders: [],
    ...overrides,
  };
}
