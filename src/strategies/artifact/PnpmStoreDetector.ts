import { IArtifactDetector } from '../../interfaces/IArtifactDetector.js';
import { ArtifactTypeInfo } from '../../types/index.js';
import * as os from 'os';
import * as path from 'path';

export class PnpmStoreDetector implements IArtifactDetector {
  readonly detectorName = 'PnpmStoreDetector';

  canDetect(dirName: string, fullPath: string): boolean {
    if (dirName === '.pnpm-store') {
      return fullPath === path.join(os.homedir(), '.pnpm-store');
    }
    if (dirName === 'store') {
      return fullPath.startsWith(path.join(os.homedir(), '.local', 'share', 'pnpm'));
    }
    return false;
  }

  detect(): ArtifactTypeInfo {
    return { label: 'pnpm store', color: 'yellow', safeToClean: true };
  }
}
