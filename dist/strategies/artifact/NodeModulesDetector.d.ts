import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class NodeModulesDetector implements IArtifactDetector {
    readonly detectorName = "NodeModulesDetector";
    canDetect(dirName: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=NodeModulesDetector.d.ts.map