import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class NuxtDetector implements IArtifactDetector {
    readonly detectorName = "NuxtDetector";
    canDetect(dirName: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=NuxtDetector.d.ts.map