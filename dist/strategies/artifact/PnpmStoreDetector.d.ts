import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class PnpmStoreDetector implements IArtifactDetector {
    readonly detectorName = "PnpmStoreDetector";
    canDetect(dirName: string, fullPath: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=PnpmStoreDetector.d.ts.map