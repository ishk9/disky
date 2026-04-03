import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
export declare class XcodeDetector implements IArtifactDetector {
    readonly detectorName = "XcodeDetector";
    private static readonly DERIVED_DATA;
    canDetect(dirName: string, fullPath: string): boolean;
    detect(): ArtifactTypeInfo;
}
//# sourceMappingURL=XcodeDetector.d.ts.map