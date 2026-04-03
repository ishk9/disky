import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class CocoaPodsDetector implements IArtifactDetector {
    readonly detectorName = "CocoaPodsDetector";
    canDetect(dirName: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=CocoaPodsDetector.d.ts.map