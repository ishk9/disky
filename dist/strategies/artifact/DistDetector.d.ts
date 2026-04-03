import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class DistDetector implements IArtifactDetector {
    readonly detectorName = "DistDetector";
    canDetect(dirName: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=DistDetector.d.ts.map