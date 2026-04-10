import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class TurboDetector implements IArtifactDetector {
  readonly detectorName = 'TurboDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.turbo';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.turbo', color: 'gray', safeToClean: true };
  }
}
