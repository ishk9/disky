import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IScanner, type ScanOptions } from '../interfaces/IScanner.js';
import { DiskEntry, TopOffender, ArtifactTypeInfo } from '../types/index.js';
import { ProjectDetector, type ProjectInfoCache } from './ProjectDetector.js';
import { ArtifactDetectorRegistry } from '../strategies/artifact/ArtifactDetectorRegistry.js';
import { classifyCleanPolicy } from './CleanPolicy.js';
import type { IDirSizer, ChildSize } from '../platform/IDirSizer.js';
import type { IFileFinder } from '../platform/IFileFinder.js';
import type { IDockerClient } from '../platform/IDockerClient.js';
import { macosPlatform, type PlatformServices } from '../platform/macos/index.js';

const ARTIFACT_FIND_PRUNE_NAMES = ['.git', 'System', 'Applications', 'Volumes', 'proc', 'sys'];

/** Minimum directory size (bytes) to include in `--all` mode. */
const ALL_MODE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB

/** How deep to walk when looking for artifact directories. */
const ARTIFACT_SCAN_DEPTH = 6;

/** How deep to walk in `--all` mode. */
const ALL_SCAN_DEPTH = 3;

/** Number of top offenders to show in the detail view. */
const TOP_OFFENDERS_LIMIT = 5;

/**
 * Scans the filesystem for known build artifacts (and, in `--all` mode, any
 * large directory). All disk I/O is delegated to injected platform services
 * ({@link IDirSizer}, {@link IFileFinder}, {@link IDockerClient}) so the scan
 * logic is unit-testable with fakes.
 */
export class DiskScanner implements IScanner {
  private readonly projectDetector = new ProjectDetector();
  private readonly registry = ArtifactDetectorRegistry.getInstance();
  private readonly dirSizer: IDirSizer;
  private readonly fileFinder: IFileFinder;
  private readonly dockerClient: IDockerClient;

  constructor(platform: PlatformServices = macosPlatform()) {
    this.dirSizer = platform.dirSizer;
    this.fileFinder = platform.fileFinder;
    this.dockerClient = platform.dockerClient;
  }

  async scan(artifactOnly: boolean, options: ScanOptions = {}): Promise<DiskEntry[]> {
    const entries: DiskEntry[] = [];
    const projectInfoCache: ProjectInfoCache = new Map();
    const includeTopOffenders = options.includeTopOffenders ?? true;
    let idCounter = 1;

    if (artifactOnly) {
      const artifactPaths = this.findArtifactPaths();
      const sizes = await this.dirSizer.sizes(artifactPaths);

      const offendersByPath = includeTopOffenders
        ? await this.topOffendersFor(artifactPaths.filter((p) => (sizes.get(p) ?? 0) > 0))
        : new Map<string, TopOffender[]>();

      for (const absPath of artifactPaths) {
        const sizeBytes = sizes.get(absPath) ?? 0;
        if (sizeBytes === 0) continue;

        const entry = this.buildEntry(
          absPath,
          sizeBytes,
          idCounter++,
          includeTopOffenders ? offendersByPath.get(absPath) : [],
          projectInfoCache,
          undefined,
          'artifact',
        );
        if (entry) entries.push(entry);
      }

      const dockerEntry = this.buildDockerEntry(idCounter++);
      if (dockerEntry) entries.push(dockerEntry);
    } else {
      const largeDirs = this.fileFinder.largeDirs(os.homedir(), {
        maxDepth: ALL_SCAN_DEPTH,
        minBytes: ALL_MODE_THRESHOLD_BYTES,
      });
      for (const [absPath, sizeBytes] of largeDirs) {
        const entry = this.buildEntry(
          absPath,
          sizeBytes,
          idCounter++,
          includeTopOffenders ? undefined : [],
          projectInfoCache,
          this.largeDirArtifact(),
          'all',
        );
        if (entry) entries.push(entry);
      }
    }

    return entries.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  // ─── Artifact-mode scanning ──────────────────────────────────────────────

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

  // ─── Entry construction ──────────────────────────────────────────────────

  private buildEntry(
    absPath: string,
    sizeBytes: number,
    id: number,
    topOffenders?: TopOffender[],
    projectInfoCache?: ProjectInfoCache,
    fallbackArtifact?: ArtifactTypeInfo,
    mode: 'artifact' | 'all' = 'artifact',
  ): DiskEntry | null {
    const dirName = path.basename(absPath);

    const projectInfo = this.projectDetector.resolve(path.dirname(absPath), projectInfoCache);
    const detectedArtifact =
      this.registry.resolve(dirName, absPath) ?? fallbackArtifact ?? this.unknownArtifact();
    const artifactType = classifyCleanPolicy(
      detectedArtifact,
      absPath,
      projectInfo.directory,
      mode,
    );
    const ageMs = this.getAgeMs(absPath);

    return {
      id,
      sizeBytes,
      sizeHuman: formatBytes(sizeBytes),
      artifactType,
      absolutePath: absPath,
      displayPath: abbreviateHome(absPath),
      project: projectInfo.project,
      directory: projectInfo.directory,
      gitBranch: projectInfo.gitBranch,
      ageMs,
      ageHuman: formatAge(ageMs),
      isDockerEntry: false,
      dockerSummary: null,
      topOffenders: topOffenders ?? this.topOffendersSync(absPath),
    };
  }

  private buildDockerEntry(id: number): DiskEntry | null {
    const stats = this.dockerClient.stats();
    if (!stats || stats.reclaimableBytes === 0) return null;

    const dockerArtifact: ArtifactTypeInfo = {
      label: 'Docker',
      color: 'blue',
      safeToClean: true,
      cleanPolicy: 'auto',
    };

    return {
      id,
      sizeBytes: stats.reclaimableBytes,
      sizeHuman: formatBytes(stats.reclaimableBytes),
      artifactType: dockerArtifact,
      absolutePath: '__docker__',
      displayPath: `overlay2 (${stats.summary})`,
      project: null,
      directory: null,
      gitBranch: null,
      ageMs: 0,
      ageHuman: '–',
      isDockerEntry: true,
      dockerSummary: stats.summary,
      topOffenders: [],
    };
  }

  // ─── Top offenders ───────────────────────────────────────────────────────

  /** Computes top offenders for many directories concurrently (detail data). */
  private async topOffendersFor(dirs: string[]): Promise<Map<string, TopOffender[]>> {
    const out = new Map<string, TopOffender[]>();
    await Promise.all(
      dirs.map(async (dir) => {
        out.set(dir, toTopOffenders(await this.dirSizer.childSizes(dir)));
      }),
    );
    return out;
  }

  /** Synchronous top offenders for one-at-a-time entry building (`--all` mode). */
  private topOffendersSync(dir: string): TopOffender[] {
    return toTopOffenders(this.dirSizer.childSizesSync(dir));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Returns mtime age in milliseconds, or 0 on error. */
  private getAgeMs(dirPath: string): number {
    try {
      const stat = fs.statSync(dirPath);
      return Date.now() - stat.mtimeMs;
    } catch {
      return 0;
    }
  }

  private unknownArtifact(): ArtifactTypeInfo {
    return {
      label: 'unknown',
      color: 'gray',
      safeToClean: false,
      cleanPolicy: 'inspect',
      cleanReason: 'disky does not recognize this as a safe cleanup artifact.',
    };
  }

  private largeDirArtifact(): ArtifactTypeInfo {
    return {
      label: 'large dir',
      color: 'gray',
      safeToClean: false,
      cleanPolicy: 'inspect',
      cleanReason: 'All-mode entries are broad directories for inspection.',
    };
  }
}

/** Maps raw child sizes to the top N offenders by size. */
function toTopOffenders(children: ChildSize[]): TopOffender[] {
  return children
    .map((c) => ({
      name: path.basename(c.path),
      sizeBytes: c.sizeBytes,
      sizeHuman: formatBytes(c.sizeBytes),
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, TOP_OFFENDERS_LIMIT);
}

// ─── Pure formatting utilities ────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatAge(ms: number): string {
  if (ms <= 0) return '–';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function abbreviateHome(absPath: string): string {
  const home = os.homedir();
  if (absPath.startsWith(home)) {
    return '~' + absPath.slice(home.length);
  }
  return absPath;
}
