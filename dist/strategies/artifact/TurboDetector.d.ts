import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class TurboDetector implements IArtifactDetector {
    readonly detectorName = "TurboDetector";
    canDetect(dirName: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=TurboDetector.d.ts.map