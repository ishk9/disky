import { execSync, execFile, execFileSync, spawnSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IScanner, type ScanOptions } from '../interfaces/IScanner.js';
import { DiskEntry, TopOffender, ArtifactTypeInfo } from '../types/index.js';
import { ProjectDetector, type ProjectInfoCache } from './ProjectDetector.js';
import { DockerScanner } from './DockerScanner.js';
import { ArtifactDetectorRegistry } from '../strategies/artifact/ArtifactDetectorRegistry.js';
import { classifyCleanPolicy } from './CleanPolicy.js';

const execFileAsync = promisify(execFile);

/** Max concurrent `du` processes; keep this modest to avoid I/O thrash. */
const DU_CONCURRENCY = 8;

/** Directories skipped when walking the filesystem to avoid infinite loops / system noise. */
const SKIP_DIRS = new Set([
  'node_modules', // descend into project roots, not into node_modules
  '.git',
  'Library',       // macOS system libraries — handled separately
  'System',
  'Applications',
  'Volumes',
  'proc',
  'sys',
  'dev',
]);

const ARTIFACT_FIND_PRUNE_NAMES = ['.git', 'System', 'Applications', 'Volumes', 'proc', 'sys'];

/** Minimum directory size (bytes) to include in `--all` mode. */
const ALL_MODE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB

/** How deep to walk when looking for artifact directories. */
const ARTIFACT_SCAN_DEPTH = 6;

/** How deep to walk in `--all` mode. */
const ALL_SCAN_DEPTH = 3;

/** Number of top offenders to show in the detail view. */
const TOP_OFFENDERS_LIMIT = 5;

export class DiskScanner implements IScanner {
  private readonly projectDetector = new ProjectDetector();
  private readonly dockerScanner = new DockerScanner();
  private readonly registry = ArtifactDetectorRegistry.getInstance();

  async scan(artifactOnly: boolean, options: ScanOptions = {}): Promise<DiskEntry[]> {
    const entries: DiskEntry[] = [];
    const projectInfoCache: ProjectInfoCache = new Map();
    const includeTopOffenders = options.includeTopOffenders ?? true;
    let idCounter = 1;

    if (artifactOnly) {
      const artifactPaths = this.findArtifactPaths();
      const sizes = await this.parallelDirSizes(artifactPaths);

      const offendersByPath = includeTopOffenders
        ? await this.parallelTopOffenders(artifactPaths.filter((p) => (sizes.get(p) ?? 0) > 0))
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
      const largeDirs = this.findAllLargeDirs();
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
   * Uses `find` to locate known artifact directory names under the home directory.
   * Uses spawnSync with an explicit args array to avoid shell quoting issues with
   * the `(` `)` grouping operators.
   */
  private findArtifactPaths(): string[] {
    const names = this.registry.getKnownDirNames();
    if (names.length === 0) return [];

    const home = os.homedir();

    // Build args array:
    // find HOME -maxdepth N ( expensive-prunes ) -prune -o -type d ( target names ) -print -prune
    const args: string[] = [home, '-maxdepth', String(ARTIFACT_SCAN_DEPTH), '('];
    const pruneNames = ARTIFACT_FIND_PRUNE_NAMES;
    const prunePaths = [
      path.join(home, 'Library', 'Application Support'),
      path.join(home, 'Library', 'Containers'),
      path.join(home, 'Library', 'Group Containers'),
    ];

    let hasPrune = false;
    const pushPrune = (kind: '-name' | '-path', value: string) => {
      if (hasPrune) args.push('-o');
      args.push(kind, value);
      hasPrune = true;
    };

    for (const name of pruneNames) pushPrune('-name', name);
    for (const prunePath of prunePaths) pushPrune('-path', prunePath);

    args.push(')', '-prune', '-o', '-type', 'd', '(');
    for (let i = 0; i < names.length; i++) {
      if (i > 0) args.push('-o');
      args.push('-name', names[i]);
    }
    args.push(')', '-print', '-prune');

    const result = spawnSync('find', args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.status !== 0 && !result.stdout) return [];

    const paths = (result.stdout ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Check well-known global cache paths directly — their basenames (e.g. "cache",
    // "store") are too generic for the `find` filter, so we probe them explicitly.
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

  // ─── All-mode scanning ───────────────────────────────────────────────────

  /**
   * Returns all directories above the size threshold by running `du` up to ALL_SCAN_DEPTH.
   */
  private findAllLargeDirs(): Array<[string, number]> {
    const home = os.homedir();
    const results: Array<[string, number]> = [];

    try {
      const raw = execSync(
        `du -d ${ALL_SCAN_DEPTH} -k "${home}" 2>/dev/null | sort -rn`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 },
      );

      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const tab = trimmed.indexOf('\t');
        if (tab === -1) continue;

        const kb = parseInt(trimmed.slice(0, tab), 10);
        const dirPath = trimmed.slice(tab + 1);
        const sizeBytes = kb * 1024;

        if (sizeBytes < ALL_MODE_THRESHOLD_BYTES) continue;
        if (!dirPath || dirPath === home) continue;

        results.push([dirPath, sizeBytes]);
      }
    } catch {
      // du unavailable
    }

    return results;
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
    const detectedArtifact = this.registry.resolve(dirName, absPath) ?? fallbackArtifact ?? this.unknownArtifact();
    const artifactType = classifyCleanPolicy(detectedArtifact, absPath, projectInfo.directory, mode);
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
      topOffenders: topOffenders ?? this.getTopOffenders(absPath),
    };
  }

  private buildDockerEntry(id: number): DiskEntry | null {
    const stats = this.dockerScanner.scan();
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Sizes many directories by running multiple `du -sk` processes concurrently.
   *
   * Empirically: a single `du -sk path1 path2 ...` and N sequential `du -sk path`
   * calls finish in roughly the same wall clock on macOS — `du` itself is the
   * bottleneck, not process spawn overhead. The real win comes from running
   * several `du` processes in parallel so the OS can pipeline disk I/O.
   *
   * Concurrency is capped at DU_CONCURRENCY to avoid fork-bombing the OS.
   */
  private async parallelDirSizes(paths: string[]): Promise<Map<string, number>> {
    const sizes = new Map<string, number>();
    if (paths.length === 0) return sizes;

    let cursor = 0;
    const workers = Array.from({ length: Math.min(DU_CONCURRENCY, paths.length) }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= paths.length) return;
        const p = paths[idx];
        try {
          const { stdout } = await execFileAsync('du', ['-sk', p], {
            encoding: 'utf8',
            maxBuffer: 4 * 1024 * 1024,
          });
          const kb = parseInt(stdout.split('\t')[0] ?? '0', 10);
          if (!isNaN(kb)) sizes.set(p, kb * 1024);
        } catch {
          sizes.set(p, 0);
        }
      }
    });
    await Promise.all(workers);

    return sizes;
  }

  /** Returns mtime age in milliseconds, or 0 on error. */
  private getAgeMs(dirPath: string): number {
    try {
      const stat = fs.statSync(dirPath);
      return Date.now() - stat.mtimeMs;
    } catch {
      return 0;
    }
  }

  /**
   * Computes top offenders for many artifact directories concurrently.
   * This is skipped for table/list scans and reserved for detail data.
   */
  private async parallelTopOffenders(dirs: string[]): Promise<Map<string, TopOffender[]>> {
    const out = new Map<string, TopOffender[]>();
    if (dirs.length === 0) return out;

    let cursor = 0;
    const workers = Array.from({ length: Math.min(DU_CONCURRENCY, dirs.length) }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= dirs.length) return;
        const dir = dirs[idx];
        out.set(dir, await this.computeTopOffenders(dir));
      }
    });
    await Promise.all(workers);

    return out;
  }

  private async computeTopOffenders(dirPath: string): Promise<TopOffender[]> {
    try {
      const children = fs.readdirSync(dirPath).map((name) => path.join(dirPath, name));
      if (children.length === 0) return [];

      const { stdout } = await execFileAsync(
        'du',
        ['-sk', ...children],
        { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
      );

      return this.parseTopOffenders(stdout);
    } catch (err) {
      return this.parseTopOffenders(stdoutFromExecError(err));
    }
  }

  /** Synchronous shim retained for callers that build entries one at a time. */
  private getTopOffenders(dirPath: string): TopOffender[] {
    try {
      const children = fs.readdirSync(dirPath).map((name) => path.join(dirPath, name));
      if (children.length === 0) return [];

      const raw = execFileSync('du', ['-sk', ...children], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return this.parseTopOffenders(raw);
    } catch (err) {
      return this.parseTopOffenders(stdoutFromExecError(err));
    }
  }

  private parseTopOffenders(raw: string): TopOffender[] {
    const offenders: TopOffender[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const tab = trimmed.indexOf('\t');
      if (tab === -1) continue;

      const kb = parseInt(trimmed.slice(0, tab), 10);
      const fullPath = trimmed.slice(tab + 1);
      const sizeBytes = kb * 1024;

      offenders.push({
        name: path.basename(fullPath),
        sizeBytes,
        sizeHuman: formatBytes(sizeBytes),
      });
    }

    offenders.sort((a, b) => b.sizeBytes - a.sizeBytes);
    return offenders.slice(0, TOP_OFFENDERS_LIMIT);
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

function stdoutFromExecError(err: unknown): string {
  const stdout = (err as { stdout?: unknown }).stdout;
  if (typeof stdout === 'string') return stdout;
  if (Buffer.isBuffer(stdout)) return stdout.toString('utf8');
  return '';
}

// ─── Pure formatting utilities ────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatAge(ms: number): string {
  if (ms <= 0) return '–';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);

  if (days > 0)    return `${days}d ago`;
  if (hours > 0)   return `${hours}h ago`;
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
