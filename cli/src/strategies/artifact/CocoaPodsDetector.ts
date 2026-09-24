import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class CocoaPodsDetector implements IArtifactDetector {
  readonly detectorName = 'CocoaPodsDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'Pods';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'CocoaPods', color: 'red', safeToClean: true };
  }
}
