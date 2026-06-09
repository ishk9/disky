import { DiskEntry } from '../types/index.js';

export interface ScanOptions {
  /**
   * When false, omit per-entry top offender breakdowns. Table/list views do not
   * render them, and skipping them avoids a second `du` pass over every artifact.
   */
  includeTopOffenders?: boolean;
}

export interface IScanner {
  /**
   * @param artifactOnly  When true, limit results to known artifact types. Entries
   *                      may still be locked and excluded from default cleanup.
   *                      When false, include all large directories above the size threshold.
   */
  scan(artifactOnly: boolean, options?: ScanOptions): Promise<DiskEntry[]>;
}
