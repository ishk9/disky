import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';

export class NodeModulesDetector implements IArtifactDetector {
  readonly detectorName = 'NodeModulesDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'node_modules';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'node_modules', color: 'green', safeToClean: true };
  }
}
