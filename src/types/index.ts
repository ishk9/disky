export type ArtifactColorKey =
  | 'green'
  | 'cyan'
  | 'blue'
  | 'yellow'
  | 'gray'
  | 'red'
  | 'magenta';

/**
 * Metadata about an artifact type (e.g. node_modules, .next, Docker).
 * Produced by IArtifactDetector implementations.
 */
export interface ArtifactTypeInfo {
  /** Short display label shown in the TYPE column. */
  label: string;
  /** ANSI color key for the label. */
  color: ArtifactColorKey;
  /** Whether this artifact is safe for automated removal via `disky clean`. */
  safeToClean: boolean;
}

/**
 * One subdirectory or package within an artifact directory, ranked by size.
 * Used in the detail view "Top Offenders" section.
 */
export interface TopOffender {
  name: string;
  sizeBytes: number;
  sizeHuman: string;
}

/**
 * A single disk-hog entry as returned by DiskScanner / DockerScanner.
 * IDs are 1-indexed, sequential, and reset each scan.
 */
export interface DiskEntry {
  /** Sequential 1-indexed ID assigned at scan time. */
  id: number;
  sizeBytes: number;
  sizeHuman: string;
  artifactType: ArtifactTypeInfo;
  /** Resolved absolute path on disk. */
  absolutePath: string;
  /** Path shown to the user, with HOME abbreviated as ~. */
  displayPath: string;
  /** Nearest project name inferred from package.json / go.mod / Cargo.toml / git root. */
  project: string | null;
  /** Absolute path of the inferred project root. */
  directory: string | null;
  gitBranch: string | null;
  /** Milliseconds since last modification (fs.stat mtime). */
  ageMs: number;
  /** Human-readable age string, e.g. "3d ago", "1h ago". */
  ageHuman: string;
  /** True when this entry represents Docker images/containers rather than a filesystem path. */
  isDockerEntry: boolean;
  /** Summary string for Docker entries, e.g. "3 images, 2 stopped containers". */
  dockerSummary: string | null;
  /** Top N largest subdirectories or packages inside the artifact directory. */
  topOffenders: TopOffender[];
}

/**
 * Minimal serialisable form written to ~/.disky/last-scan.json so that
 * `disky clean <id>` can resolve entries without re-scanning.
 */
export interface CachedEntry {
  id: number;
  absolutePath: string;
  isDockerEntry: boolean;
  sizeHuman: string;
  artifactLabel: string;
  project: string | null;
}
