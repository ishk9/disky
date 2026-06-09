/** Reclaimable Docker resource statistics. */
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
 * Talks to the Docker CLI. Domain code depends on this interface so Docker can
 * be faked or absent without breaking scans.
 */
export interface IDockerClient {
  /** True when the Docker daemon is reachable. */
  isAvailable(): boolean;
  /** Reclaimable stats, or null when Docker is unavailable or errors. */
  stats(): DockerStats | null;
  /** Prune stopped containers and dangling images. Returns true on success. */
  prune(): boolean;
}
