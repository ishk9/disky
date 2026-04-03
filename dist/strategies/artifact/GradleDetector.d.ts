import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class GradleDetector implements IArtifactDetector {
    readonly detectorName = "GradleDetector";
    canDetect(dirName: string, fullPath: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=GradleDetector.d.ts.map