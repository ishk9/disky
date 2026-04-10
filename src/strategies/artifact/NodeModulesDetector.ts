import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';

export class NodeModulesDetector implements IArtifactDetector {
  readonly detectorName = 'NodeModulesDetector';

  canDetect(dirName: string): boolean {
    return dirName === 'node_modules';
  }

  detect(): ArtifactTypeInfo {
    return { label: 'node_modules', color: 'green', safeToClean: true };
  }
}
