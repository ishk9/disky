import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class NuxtDetector implements IArtifactDetector {
  readonly detectorName = 'NuxtDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.nuxt';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.nuxt', color: 'cyan', safeToClean: true };
  }
}
