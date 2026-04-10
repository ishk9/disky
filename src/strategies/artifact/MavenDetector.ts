import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';
import * as os from 'os';
import * as path from 'path';

export class MavenDetector implements IArtifactDetector {
  readonly detectorName = 'MavenDetector';

  canDetect(dirName: string, fullPath: string): boolean {
    if (dirName !== 'repository') return false;
    const m2Dir = path.join(os.homedir(), '.m2');
    return fullPath.startsWith(m2Dir);
  }

  detect(): ArtifactTypeInfo {
    return { label: '.m2', color: 'gray', safeToClean: true };
  }
}
