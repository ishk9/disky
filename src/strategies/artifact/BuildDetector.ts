import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class BuildDetector implements IArtifactDetector {
  readonly detectorName = 'BuildDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'build';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'build', color: 'yellow', safeToClean: true };
  }
}
