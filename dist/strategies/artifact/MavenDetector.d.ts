import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class MavenDetector implements IArtifactDetector {
    readonly detectorName = "MavenDetector";
    canDetect(dirName: string, fullPath: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=MavenDetector.d.ts.map