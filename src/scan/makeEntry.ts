import * as fs from 'fs';
import { DiskEntry, EntryCategory, ArtifactTypeInfo, TopOffender } from '../types/index.js';
import { formatBytes, formatAge, abbreviateHome } from '../core/format.js';
import { isProtectedPath } from '../core/ProtectedPaths.js';

export interface MakeEntryParams {
  absPath: string;
  sizeBytes: number;
  category: EntryCategory;
  artifactType: ArtifactTypeInfo;
  /** Age in ms; computed from mtime when omitted. */
  ageMs?: number;
  displayPath?: string;
  topOffenders?: TopOffender[];
}

/**
 * Builds a {@link DiskEntry} for non-artifact categories (caches, logs, trash,
 * installers, large files) that do not need project detection. Applies a
 * protected-path safety net: anything under the disky runtime / a toolchain is
 * forced to `locked` regardless of the provider's declared policy.
 */
export function makeEntry(p: MakeEntryParams): DiskEntry {
  const ageMs = p.ageMs ?? ageOf(p.absPath);
  let artifactType = p.artifactType;
  if (artifactType.cleanPolicy !== 'locked' && isProtectedPath(p.absPath)) {
    artifactType = {
      ...artifactType,
      cleanPolicy: 'locked',
      safeToClean: false,
      cleanReason: 'This path belongs to the running disky package or a managed toolchain.',
    };
  }

  return {
    id: 0,
    category: p.category,
    sizeBytes: p.sizeBytes,
    sizeHuman: formatBytes(p.sizeBytes),
    artifactType,
    absolutePath: p.absPath,
    displayPath: p.displayPath ?? abbreviateHome(p.absPath),
    project: null,
    directory: null,
    gitBranch: null,
    ageMs,
    ageHuman: formatAge(ageMs),
    isDockerEntry: false,
    dockerSummary: null,
    topOffenders: p.topOffenders ?? [],
  };
}

function ageOf(p: string): number {
  try {
    return Date.now() - fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}
