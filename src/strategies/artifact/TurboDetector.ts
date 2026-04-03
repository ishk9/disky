import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class TurboDetector implements IArtifactDetector {
  readonly detectorName = 'TurboDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.turbo';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.turbo', color: 'gray', safeToClean: true };
  }
}
