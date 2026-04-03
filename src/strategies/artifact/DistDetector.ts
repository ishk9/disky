import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class DistDetector implements IArtifactDetector {
  readonly detectorName = 'DistDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'dist';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'dist', color: 'yellow', safeToClean: true };
  }
}
