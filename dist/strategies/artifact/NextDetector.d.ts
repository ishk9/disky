import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class NextDetector implements IArtifactDetector {
    readonly detectorName = "NextDetector";
    canDetect(dirName: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=NextDetector.d.ts.map