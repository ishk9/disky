import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IScanner } from '../interfaces/IScanner';
import { DiskEntry, TopOffender, ArtifactTypeInfo } from '../types';
import { ProjectDetector } from './ProjectDetector';
import { DockerScanner } from './DockerScanner';
import { ArtifactDetectorRegistry } from '../strategies/artifact/ArtifactDetectorRegistry';

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

  async scan(artifactOnly: boolean): Promise<DiskEntry[]> {
    const entries: DiskEntry[] = [];
    let idCounter = 1;

    if (artifactOnly) {
      const artifactPaths = this.findArtifactPaths();
      for (const absPath of artifactPaths) {
        const sizeBytes = this.getDirSizeBytes(absPath);
        if (sizeBytes === 0) continue;

        const entry = this.buildEntry(absPath, sizeBytes, idCounter++);
        if (entry) entries.push(entry);
      }

      const dockerEntry = this.buildDockerEntry(idCounter++);
      if (dockerEntry) entries.push(dockerEntry);
    } else {
      const largeDirs = this.findAllLargeDirs();
      for (const [absPath, sizeBytes] of largeDirs) {
        const entry = this.buildEntry(absPath, sizeBytes, idCounter++);
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

    // Build args array: find HOME -maxdepth N -type d ( -name A -o -name B ... ) -prune
    const args: string[] = [home, '-maxdepth', String(ARTIFACT_SCAN_DEPTH), '-type', 'd', '('];
    for (let i = 0; i < names.length; i++) {
      if (i > 0) args.push('-o');
      args.push('-name', names[i]);
    }
    args.push(')', '-prune');

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
      path.join(home, '.bun', 'install', 'cache'),
      path.join(home, '.pnpm-store'),
      path.join(home, '.local', 'share', 'pnpm', 'store'),
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

  private buildEntry(absPath: string, sizeBytes: number, id: number): DiskEntry | null {
    const dirName = path.basename(absPath);
    const artifactType = this.registry.resolve(dirName, absPath) ?? this.unknownArtifact();

    const projectInfo = this.projectDetector.resolve(path.dirname(absPath));
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
      topOffenders: this.getTopOffenders(absPath),
    };
  }

  private buildDockerEntry(id: number): DiskEntry | null {
    const stats = this.dockerScanner.scan();
    if (!stats || stats.reclaimableBytes === 0) return null;

    const dockerArtifact: ArtifactTypeInfo = {
      label: 'Docker',
      color: 'blue',
      safeToClean: true,
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

  /** Returns size of a directory in bytes using `du -sk`. */
  private getDirSizeBytes(dirPath: string): number {
    try {
      const raw = execSync(`du -sk "${dirPath}" 2>/dev/null`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const kb = parseInt(raw.split('\t')[0] ?? '0', 10);
      return kb * 1024;
    } catch {
      return 0;
    }
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
   * Finds the largest immediate subdirectories or files within an artifact directory.
   * Skipped for Docker entries.
   */
  private getTopOffenders(dirPath: string): TopOffender[] {
    try {
      const raw = execSync(`du -sk "${dirPath}"/* 2>/dev/null | sort -rn | head -${TOP_OFFENDERS_LIMIT + 1}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const offenders: TopOffender[] = [];

      for (const line of raw.split('\n').slice(0, TOP_OFFENDERS_LIMIT)) {
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

      return offenders;
    } catch {
      return [];
    }
  }

  private unknownArtifact(): ArtifactTypeInfo {
    return { label: 'unknown', color: 'gray', safeToClean: false };
  }
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
