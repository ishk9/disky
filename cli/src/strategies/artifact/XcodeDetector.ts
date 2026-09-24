import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
import * as os from 'os';
import * as path from 'path';

export class XcodeDetector implements IArtifactDetector {
  readonly detectorName = 'XcodeDetector';

  private static readonly DERIVED_DATA = path.join(
    os.homedir(),
    'Library',
    'Developer',
    'Xcode',
    'DerivedData',
  );

  canDetect(dirName: string, fullPath: string): boolean {
    return dirName === 'DerivedData' && fullPath === XcodeDetector.DERIVED_DATA;
  }

  detect(): ArtifactTypeInfo {
    return { label: 'Xcode DerivedData', color: 'gray', safeToClean: true };
  }
}
