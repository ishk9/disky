import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class BunCacheDetector implements IArtifactDetector {
    readonly detectorName = "BunCacheDetector";
    canDetect(dirName: string, fullPath: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=BunCacheDetector.d.ts.map