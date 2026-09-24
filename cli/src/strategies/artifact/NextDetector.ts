import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class NextDetector implements IArtifactDetector {
  readonly detectorName = 'NextDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.next';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.next', color: 'cyan', safeToClean: true };
  }
}
