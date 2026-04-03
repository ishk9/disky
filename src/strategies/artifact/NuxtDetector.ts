import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class NuxtDetector implements IArtifactDetector {
  readonly detectorName = 'NuxtDetector';

  canDetect(dirName: string): boolean {
    return dirName === '.nuxt';
  }

  detect(): ArtifactTypeInfo {
    return { label: '.nuxt', color: 'cyan', safeToClean: true };
  }
}
