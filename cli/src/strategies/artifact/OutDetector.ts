import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class OutDetector implements IArtifactDetector {
  readonly detectorName = 'OutDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'out';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'out', color: 'yellow', safeToClean: true };
  }
}
