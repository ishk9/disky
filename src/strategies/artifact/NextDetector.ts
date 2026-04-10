import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class NextDetector implements IArtifactDetector {
  readonly detectorName = 'NextDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.next';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.next', color: 'cyan', safeToClean: true };
  }
}
