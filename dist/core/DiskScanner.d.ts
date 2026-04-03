import { IScanner } from '../interfaces/IScanner';
import { DiskEntry } from '../types';
export declare class DiskScanner implements IScanner {
    private readonly projectDetector;
    private readonly dockerScanner;
    private readonly registry;
    scan(artifactOnly: boolean): Promise<DiskEntry[]>;
    /**
     * Uses `find` to locate known artifact directory names under the home directory.
     * Uses spawnSync with an explicit args array to avoid shell quoting issues with
     * the `(` `)` grouping operators.
     */
    private findArtifactPaths;
    /**
     * Returns all directories above the size threshold by running `du` up to ALL_SCAN_DEPTH.
     */
    private findAllLargeDirs;
    private buildEntry;
    private buildDockerEntry;
    /** Returns size of a directory in bytes using `du -sk`. */
    private getDirSizeBytes;
    /** Returns mtime age in milliseconds, or 0 on error. */
    private getAgeMs;
    /**
     * Finds the largest immediate subdirectories or files within an artifact directory.
     * Skipped for Docker entries.
     */
    private getTopOffenders;
    private unknownArtifact;
}
export declare function formatBytes(bytes: number): string;
export declare function formatAge(ms: number): string;
export declare function abbreviateHome(absPath: string): string;
//# sourceMappingURL=DiskScanner.d.ts.map