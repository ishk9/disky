export interface DockerStats {
    /** Total bytes consumed by images. */
    imageSizeBytes: number;
    /** Number of images (total, including used). */
    imageCount: number;
    /** Number of dangling (unused) images. */
    danglingImageCount: number;
    /** Number of stopped / exited containers. */
    stoppedContainerCount: number;
    /** Aggregate bytes reclaimable from stopped containers + dangling images. */
    reclaimableBytes: number;
    /** Human-readable summary, e.g. "3 images, 2 stopped containers". */
    summary: string;
}
/**
 * Queries Docker for reclaimable disk space from stopped containers and dangling images.
 * Returns null when Docker is not installed or not running.
 */
export declare class DockerScanner {
    scan(): DockerStats | null;
    private isDockerAvailable;
    private getImageStats;
    private getStoppedContainerStats;
    /** Parses Docker size strings like "1.5GB", "340MB", "512kB" into bytes. */
    private parseDockerSize;
    private buildSummary;
}
//# sourceMappingURL=DockerScanner.d.ts.map