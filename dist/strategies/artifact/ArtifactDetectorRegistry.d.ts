import { IArtifactDetector } from '../../interfaces/IArtifactDetector';
import { ArtifactTypeInfo } from '../../types';
/**
 * Registry (Singleton) that holds all artifact detectors and applies the Strategy
 * pattern: the first detector whose canDetect() returns true wins.
 *
 * Ordering matters — more specific detectors (path-based like Gradle, Maven, Xcode)
 * must come before generic name-only ones to avoid false matches.
 */
export declare class ArtifactDetectorRegistry {
    private static instance;
    private readonly detectors;
    private constructor();
    static getInstance(): ArtifactDetectorRegistry;
    /**
     * Prepends a custom detector at the front of the chain (highest priority).
     * Useful for extending the registry at runtime.
     */
    register(detector: IArtifactDetector): void;
    /**
     * Returns the first matching ArtifactTypeInfo or null if no detector matches.
     */
    resolve(dirName: string, fullPath: string): ArtifactTypeInfo | null;
    /**
     * Returns all directory basenames that name-only detectors recognise.
     * Used by DiskScanner to build the `find` command filter expression.
     */
    getKnownDirNames(): string[];
}
//# sourceMappingURL=ArtifactDetectorRegistry.d.ts.map