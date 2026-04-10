import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';
import * as os from 'os';
import * as path from 'path';

export class GradleDetector implements IArtifactDetector {
  readonly detectorName = 'GradleDetector';

  canDetect(dirName: string, fullPath: string): boolean {
    if (dirName !== 'caches') return false;
    const gradleDir = path.join(os.homedir(), '.gradle');
    return fullPath.startsWith(gradleDir);
  }

  detect(): ArtifactTypeInfo {
    return { label: '.gradle', color: 'gray', safeToClean: true };
  }
}
