import { ArtifactTypeInfo } from '../types';

/**
 * Strategy interface: each implementation matches one artifact type
 * (e.g. node_modules, .next, .gradle) against a directory name / path.
 *
 * Detectors are tested in registry order — more specific ones first.
 */
export interface IArtifactDetector {
  /** Human-readable name of this detector, used for debugging. */
  readonly detectorName: string;

  /**
   * Returns true when this detector recognises the given directory.
   * @param dirName  Basename of the directory (e.g. "node_modules").
   * @param fullPath Absolute path (allows path-based matching for global caches).
   */
  canDetect(dirName: string, fullPath: string): boolean;

  /**
   * Returns the ArtifactTypeInfo for the matched directory.
   * Only called when canDetect() returned true.
   */
  detect(dirName: string, fullPath: string): ArtifactTypeInfo;
}
