import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class CocoaPodsDetector implements IArtifactDetector {
  readonly detectorName = 'CocoaPodsDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'Pods';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'CocoaPods', color: 'red', safeToClean: true };
  }
}
