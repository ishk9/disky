import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class CacheDetector implements IArtifactDetector {
  readonly detectorName = 'CacheDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.cache';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.cache', color: 'gray', safeToClean: true };
  }
}
