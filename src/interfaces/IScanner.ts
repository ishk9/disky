import { DiskEntry } from '../types/index.js';

/** Live progress emitted during a scan, for spinners / progress bars. */
export interface ScanProgress {
  /** Coarse phase of the scan. */
  phase: 'find' | 'size' | 'docker';
  /** Directories sized so far. */
  scanned: number;
  /** Total directories to size (0 until known). */
  total: number;
  /** Entries with non-zero size found so far. */
  found: number;
  /** Path currently being processed, if any. */
  current?: string;
}

export interface ScanOptions {
  /**
   * When false, omit per-entry top offender breakdowns. Table/list views do not
   * render them, and skipping them avoids a second `du` pass over every artifact.
   */
  includeTopOffenders?: boolean;
  /** Optional progress callback invoked as the scan proceeds. */
  onProgress?: (progress: ScanProgress) => void;
}

export interface IScanner {
  /**
   * @param artifactOnly  When true, limit results to known artifact types. Entries
   *                      may still be locked and excluded from default cleanup.
   *                      When false, include all large directories above the size threshold.
   */
  scan(artifactOnly: boolean, options?: ScanOptions): Promise<DiskEntry[]>;
}
