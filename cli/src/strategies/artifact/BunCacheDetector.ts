import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
import * as os from 'os';
import * as path from 'path';

export class BunCacheDetector implements IArtifactDetector {
  readonly detectorName = 'BunCacheDetector';

  canDetect(dirName: string, fullPath: string): boolean {
    return dirName === 'cache' && fullPath === path.join(os.homedir(), '.bun', 'install', 'cache');
  }

  detect(): ArtifactTypeInfo {
    return { label: 'bun cache', color: 'yellow', safeToClean: true };
  }
}
