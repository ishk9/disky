import { describe, it, expect, vi, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { NodeModulesDetector } from '../src/strategies/artifact/NodeModulesDetector';
import { NextDetector } from '../src/strategies/artifact/NextDetector';
import { NuxtDetector } from '../src/strategies/artifact/NuxtDetector';
import { DistDetector } from '../src/strategies/artifact/DistDetector';
import { BuildDetector } from '../src/strategies/artifact/BuildDetector';
import { OutDetector } from '../src/strategies/artifact/OutDetector';
import { TurboDetector } from '../src/strategies/artifact/TurboDetector';
import { CacheDetector } from '../src/strategies/artifact/CacheDetector';
import { CocoaPodsDetector } from '../src/strategies/artifact/CocoaPodsDetector';
import { GradleDetector } from '../src/strategies/artifact/GradleDetector';
import { MavenDetector } from '../src/strategies/artifact/MavenDetector';
import { XcodeDetector } from '../src/strategies/artifact/XcodeDetector';
import { PnpmStoreDetector } from '../src/strategies/artifact/PnpmStoreDetector';
import { BunCacheDetector } from '../src/strategies/artifact/BunCacheDetector';
import { ProjectDetector } from '../src/core/ProjectDetector';

const HOME = os.homedir();

// ─── Name-only detectors ──────────────────────────────────────────────────────

describe('NodeModulesDetector', () => {
  const d = new NodeModulesDetector();

  it('detects node_modules', () => {
    expect(d.canDetect('node_modules', '/any/path/node_modules')).toBe(true);
  });

  it('rejects other names', () => {
    expect(d.canDetect('dist', '/any/path/dist')).toBe(false);
    expect(d.canDetect('.next', '/any/path/.next')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('node_modules', '')).toEqual({
      label: 'node_modules',
      color: 'green',
      safeToClean: true,
    });
  });
});

describe('NextDetector', () => {
  const d = new NextDetector();

  it('detects .next', () => {
    expect(d.canDetect('.next', '/project/.next')).toBe(true);
  });

  it('rejects other names', () => {
    expect(d.canDetect('next', '/project/next')).toBe(false);
    expect(d.canDetect('.nuxt', '/project/.nuxt')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('.next', '')).toEqual({
      label: '.next',
      color: 'cyan',
      safeToClean: true,
    });
  });
});

describe('NuxtDetector', () => {
  const d = new NuxtDetector();

  it('detects .nuxt', () => {
    expect(d.canDetect('.nuxt', '/project/.nuxt')).toBe(true);
  });

  it('rejects .next', () => {
    expect(d.canDetect('.next', '/project/.next')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('.nuxt', '')).toEqual({
      label: '.nuxt',
      color: 'cyan',
      safeToClean: true,
    });
  });
});

describe('DistDetector', () => {
  const d = new DistDetector();

  it('detects dist', () => {
    expect(d.canDetect('dist', '/project/dist')).toBe(true);
  });

  it('rejects build', () => {
    expect(d.canDetect('build', '/project/build')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('dist', '')).toEqual({
      label: 'dist',
      color: 'yellow',
      safeToClean: true,
    });
  });
});

describe('BuildDetector', () => {
  const d = new BuildDetector();

  it('detects build', () => {
    expect(d.canDetect('build', '/project/build')).toBe(true);
  });

  it('rejects dist', () => {
    expect(d.canDetect('dist', '/project/dist')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('build', '')).toEqual({
      label: 'build',
      color: 'yellow',
      safeToClean: true,
    });
  });
});

describe('OutDetector', () => {
  const d = new OutDetector();

  it('detects out', () => {
    expect(d.canDetect('out', '/project/out')).toBe(true);
  });

  it('rejects dist', () => {
    expect(d.canDetect('dist', '/project/dist')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('out', '')).toEqual({
      label: 'out',
      color: 'yellow',
      safeToClean: true,
    });
  });
});

describe('TurboDetector', () => {
  const d = new TurboDetector();

  it('detects .turbo', () => {
    expect(d.canDetect('.turbo', '/project/.turbo')).toBe(true);
  });

  it('rejects turbo without dot', () => {
    expect(d.canDetect('turbo', '/project/turbo')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('.turbo', '')).toEqual({
      label: '.turbo',
      color: 'gray',
      safeToClean: true,
    });
  });
});

describe('CacheDetector', () => {
  const d = new CacheDetector();

  it('detects .cache', () => {
    expect(d.canDetect('.cache', '/project/.cache')).toBe(true);
  });

  it('rejects cache without dot', () => {
    expect(d.canDetect('cache', '/project/cache')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('.cache', '')).toEqual({
      label: '.cache',
      color: 'gray',
      safeToClean: true,
    });
  });
});

describe('CocoaPodsDetector', () => {
  const d = new CocoaPodsDetector();

  it('detects Pods', () => {
    expect(d.canDetect('Pods', '/ios-project/Pods')).toBe(true);
  });

  it('is case-sensitive', () => {
    expect(d.canDetect('pods', '/ios-project/pods')).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('Pods', '')).toEqual({
      label: 'CocoaPods',
      color: 'red',
      safeToClean: true,
    });
  });
});

// ─── Path-based detectors ─────────────────────────────────────────────────────

describe('GradleDetector', () => {
  const d = new GradleDetector();
  const gradleCaches = path.join(HOME, '.gradle', 'caches');

  it('detects caches inside ~/.gradle', () => {
    expect(d.canDetect('caches', gradleCaches)).toBe(true);
  });

  it('rejects caches outside ~/.gradle', () => {
    expect(d.canDetect('caches', '/some/other/caches')).toBe(false);
    expect(d.canDetect('caches', '/tmp/caches')).toBe(false);
  });

  it('rejects wrong dir name even inside ~/.gradle', () => {
    expect(d.canDetect('wrapper', path.join(HOME, '.gradle', 'wrapper'))).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('caches', gradleCaches)).toEqual({
      label: '.gradle',
      color: 'gray',
      safeToClean: true,
    });
  });
});

describe('MavenDetector', () => {
  const d = new MavenDetector();
  const m2Repo = path.join(HOME, '.m2', 'repository');

  it('detects repository inside ~/.m2', () => {
    expect(d.canDetect('repository', m2Repo)).toBe(true);
  });

  it('rejects repository outside ~/.m2', () => {
    expect(d.canDetect('repository', '/some/other/repository')).toBe(false);
  });

  it('rejects wrong dir name inside ~/.m2', () => {
    expect(d.canDetect('settings', path.join(HOME, '.m2', 'settings'))).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('repository', m2Repo)).toEqual({
      label: '.m2',
      color: 'gray',
      safeToClean: true,
    });
  });
});

describe('XcodeDetector', () => {
  const d = new XcodeDetector();
  const derivedData = path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData');

  it('detects DerivedData at exact Xcode path', () => {
    expect(d.canDetect('DerivedData', derivedData)).toBe(true);
  });

  it('rejects DerivedData at other paths', () => {
    expect(d.canDetect('DerivedData', '/some/other/DerivedData')).toBe(false);
    expect(d.canDetect('DerivedData', path.join(HOME, 'DerivedData'))).toBe(false);
  });

  it('rejects wrong name at correct parent', () => {
    expect(
      d.canDetect('Archives', path.join(HOME, 'Library', 'Developer', 'Xcode', 'Archives')),
    ).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('DerivedData', derivedData)).toEqual({
      label: 'Xcode DerivedData',
      color: 'gray',
      safeToClean: true,
    });
  });
});

describe('PnpmStoreDetector', () => {
  const d = new PnpmStoreDetector();

  it('detects .pnpm-store at home root', () => {
    expect(d.canDetect('.pnpm-store', path.join(HOME, '.pnpm-store'))).toBe(true);
  });

  it('rejects .pnpm-store at wrong path', () => {
    expect(d.canDetect('.pnpm-store', '/tmp/.pnpm-store')).toBe(false);
  });

  it('detects store inside ~/.local/share/pnpm', () => {
    const storePath = path.join(HOME, '.local', 'share', 'pnpm', 'store');
    expect(d.canDetect('store', storePath)).toBe(true);
  });

  it('matches store even at nested pnpm subpaths (startsWith check)', () => {
    const deepStore = path.join(HOME, '.local', 'share', 'pnpm', 'store', 'v3');
    // The detector uses startsWith, so the full path still matches even if deeper.
    // In practice DiskScanner would pass dirName='v3' for this path, but the
    // detector only cares about dirName='store' — so this scenario wouldn't occur.
    // When dirName IS 'store', startsWith matches regardless of depth.
    expect(d.canDetect('store', deepStore)).toBe(true);
  });

  it('rejects store outside pnpm path', () => {
    expect(d.canDetect('store', '/some/other/store')).toBe(false);
  });

  it('rejects unrelated names', () => {
    expect(d.canDetect('node_modules', path.join(HOME, '.pnpm-store'))).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('.pnpm-store', '')).toEqual({
      label: 'pnpm store',
      color: 'yellow',
      safeToClean: true,
    });
  });
});

describe('BunCacheDetector', () => {
  const d = new BunCacheDetector();
  const bunCache = path.join(HOME, '.bun', 'install', 'cache');

  it('detects cache at exact bun path', () => {
    expect(d.canDetect('cache', bunCache)).toBe(true);
  });

  it('rejects cache at other paths', () => {
    expect(d.canDetect('cache', '/some/other/cache')).toBe(false);
    expect(d.canDetect('cache', path.join(HOME, '.cache'))).toBe(false);
  });

  it('rejects wrong name at bun path', () => {
    expect(d.canDetect('install', path.join(HOME, '.bun', 'install'))).toBe(false);
  });

  it('returns correct artifact info', () => {
    expect(d.detect('cache', bunCache)).toEqual({
      label: 'bun cache',
      color: 'yellow',
      safeToClean: true,
    });
  });
});

describe('ProjectDetector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses project info for repeated roots within a scan cache', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'disky-project-detector-'));

    try {
      fs.writeFileSync(
        path.join(projectRoot, 'package.json'),
        JSON.stringify({ name: 'cached-project' }),
      );
      const appDir = path.join(projectRoot, 'apps', 'web');
      const packageDir = path.join(projectRoot, 'packages', 'ui');
      fs.mkdirSync(appDir, { recursive: true });
      fs.mkdirSync(packageDir, { recursive: true });

      const detector = new ProjectDetector();
      const branchSpy = vi.spyOn(detector as any, 'getGitBranch').mockReturnValue('main');
      const cache = new Map();

      const first = detector.resolve(appDir, cache);
      const second = detector.resolve(packageDir, cache);

      expect(first).toEqual({
        directory: projectRoot,
        project: 'cached-project',
        gitBranch: 'main',
      });
      expect(second).toBe(first);
      expect(branchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
