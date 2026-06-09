import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DiskEntry } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import { ArtifactDetectorRegistry } from '../strategies/artifact/ArtifactDetectorRegistry.js';
import type { IDirSizer } from '../platform/IDirSizer.js';
import type { IFileFinder } from '../platform/IFileFinder.js';
import type { ProjectInfoCache } from '../core/ProjectDetector.js';
import { IScanProvider } from './IScanProvider.js';
import { EntryBuilder } from './EntryBuilder.js';

const ARTIFACT_FIND_PRUNE_NAMES = ['.git', 'System', 'Applications', 'Volumes', 'proc', 'sys'];

/** How deep to walk when looking for artifact directories. */
const ARTIFACT_SCAN_DEPTH = 6;

/** Finds known build artifacts under the home directory. */
export class ArtifactScanProvider implements IScanProvider {
  readonly category = 'artifact' as const;
  private readonly registry = ArtifactDetectorRegistry.getInstance();

  constructor(
    private readonly fileFinder: IFileFinder,
    private readonly dirSizer: IDirSizer,
    private readonly builder: EntryBuilder,
  ) {}

  async scan(opts: ScanOptions): Promise<DiskEntry[]> {
    const includeTopOffenders = opts.includeTopOffenders ?? true;

    opts.onProgress?.({ phase: 'find', scanned: 0, total: 0, found: 0 });
    const paths = this.findArtifactPaths();

    let scanned = 0;
    let found = 0;
    const sizes = await this.dirSizer.sizes(paths, (p, bytes) => {
      scanned++;
      if (bytes > 0) found++;
      opts.onProgress?.({ phase: 'size', scanned, total: paths.length, found, current: p });
    });

    const nonZero = paths.filter((p) => (sizes.get(p) ?? 0) > 0);
    const offenders = includeTopOffenders
      ? await this.builder.topOffendersFor(nonZero)
      : new Map<string, never>();

    const projectInfoCache: ProjectInfoCache = new Map();
    const entries: DiskEntry[] = [];
    for (const absPath of paths) {
      const sizeBytes = sizes.get(absPath) ?? 0;
      if (sizeBytes === 0) continue;
      entries.push(
        this.builder.build({
          absPath,
          sizeBytes,
          category: 'artifact',
          mode: 'artifact',
          topOffenders: includeTopOffenders ? offenders.get(absPath) : [],
          projectInfoCache,
        }),
      );
    }
    return entries;
  }

  /**
   * Locates known artifact directory names under the home directory, then adds
   * well-known global cache paths whose basenames are too generic for the name
   * filter (e.g. "cache", "store", "repository").
   */
  private findArtifactPaths(): string[] {
    const names = this.registry.getKnownDirNames();
    if (names.length === 0) return [];

    const home = os.homedir();
    const paths = this.fileFinder.findDirsByName(home, names, {
      maxDepth: ARTIFACT_SCAN_DEPTH,
      pruneNames: ARTIFACT_FIND_PRUNE_NAMES,
      prunePaths: [
        path.join(home, 'Library', 'Application Support'),
        path.join(home, 'Library', 'Containers'),
        path.join(home, 'Library', 'Group Containers'),
      ],
    });

    const globalCachePaths = [
      path.join(home, '.gradle', 'caches'),
      path.join(home, '.m2', 'repository'),
      path.join(home, '.bun', 'install', 'cache'),
      path.join(home, '.pnpm-store'),
      path.join(home, '.local', 'share', 'pnpm', 'store'),
      path.join(home, 'Library', 'Developer', 'Xcode', 'DerivedData'),
    ];
    for (const p of globalCachePaths) {
      if (fs.existsSync(p) && !paths.includes(p)) {
        paths.push(p);
      }
    }

    return paths;
  }
}
