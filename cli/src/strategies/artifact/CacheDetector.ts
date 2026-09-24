import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class CacheDetector implements IArtifactDetector {
  readonly detectorName = 'CacheDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.cache';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.cache', color: 'gray', safeToClean: true };
  }
}
