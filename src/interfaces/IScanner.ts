import { DiskEntry } from '../types/index.js';

export interface IScanner {
  /**
   * @param artifactOnly  When true, limit results to known safe artifact types.
   *                      When false, include all large directories above the size threshold.
   */
  scan(artifactOnly: boolean): Promise<DiskEntry[]>;
}
