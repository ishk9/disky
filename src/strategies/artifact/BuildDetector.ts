import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class BuildDetector implements IArtifactDetector {
  readonly detectorName = 'BuildDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'build';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'build', color: 'yellow', safeToClean: true };
  }
}
