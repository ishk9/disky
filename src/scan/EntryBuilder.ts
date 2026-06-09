import * as fs from 'fs';
import * as path from 'path';
import { DiskEntry, TopOffender, ArtifactTypeInfo, EntryCategory } from '../types/index.js';
import { ProjectDetector, type ProjectInfoCache } from '../core/ProjectDetector.js';
import { ArtifactDetectorRegistry } from '../strategies/artifact/ArtifactDetectorRegistry.js';
import { classifyCleanPolicy } from '../core/CleanPolicy.js';
import { formatBytes, formatAge, abbreviateHome } from '../core/format.js';
import { IDirSizer, ChildSize } from '../platform/IDirSizer.js';

/** Number of top offenders to show in the detail view. */
const TOP_OFFENDERS_LIMIT = 5;

export interface BuildEntryParams {
  absPath: string;
  sizeBytes: number;
  category: EntryCategory;
  mode: 'artifact' | 'all';
  /** Precomputed top offenders; when omitted they are computed synchronously. */
  topOffenders?: TopOffender[];
  projectInfoCache?: ProjectInfoCache;
  /** Artifact info used when the registry does not recognize the directory. */
  fallbackArtifact?: ArtifactTypeInfo;
}

/**
 * Turns a sized path into a fully classified {@link DiskEntry}. Shared by the
 * artifact and large-dir providers. IDs are assigned later by the orchestrator
 * (built entries carry id 0).
 */
export class EntryBuilder {
  private readonly projectDetector = new ProjectDetector();
  private readonly registry = ArtifactDetectorRegistry.getInstance();

  constructor(private readonly dirSizer: IDirSizer) {}

  build(params: BuildEntryParams): DiskEntry {
    const { absPath, sizeBytes, category, mode, projectInfoCache, fallbackArtifact } = params;
    const dirName = path.basename(absPath);

    const projectInfo = this.projectDetector.resolve(path.dirname(absPath), projectInfoCache);
    const detectedArtifact =
      this.registry.resolve(dirName, absPath) ?? fallbackArtifact ?? unknownArtifact();
    const artifactType = classifyCleanPolicy(
      detectedArtifact,
      absPath,
      projectInfo.directory,
      mode,
    );
    const ageMs = this.getAgeMs(absPath);

    return {
      id: 0,
      category,
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
      topOffenders: params.topOffenders ?? this.topOffendersSync(absPath),
    };
  }

  /** Computes top offenders for many directories concurrently (detail data). */
  async topOffendersFor(dirs: string[]): Promise<Map<string, TopOffender[]>> {
    const out = new Map<string, TopOffender[]>();
    await Promise.all(
      dirs.map(async (dir) => {
        out.set(dir, toTopOffenders(await this.dirSizer.childSizes(dir)));
      }),
    );
    return out;
  }

  private topOffendersSync(dir: string): TopOffender[] {
    return toTopOffenders(this.dirSizer.childSizesSync(dir));
  }

  private getAgeMs(dirPath: string): number {
    try {
      return Date.now() - fs.statSync(dirPath).mtimeMs;
    } catch {
      return 0;
    }
  }
}

/** Maps raw child sizes to the top N offenders by size. */
export function toTopOffenders(children: ChildSize[]): TopOffender[] {
  return children
    .map((c) => ({
      name: path.basename(c.path),
      sizeBytes: c.sizeBytes,
      sizeHuman: formatBytes(c.sizeBytes),
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, TOP_OFFENDERS_LIMIT);
}

export function unknownArtifact(): ArtifactTypeInfo {
  return {
    label: 'unknown',
    color: 'gray',
    safeToClean: false,
    cleanPolicy: 'inspect',
    cleanReason: 'disky does not recognize this as a safe cleanup artifact.',
  };
}

export function largeDirArtifact(): ArtifactTypeInfo {
  return {
    label: 'large dir',
    color: 'gray',
    safeToClean: false,
    cleanPolicy: 'inspect',
    cleanReason: 'All-mode entries are broad directories for inspection.',
  };
}
