/** Age threshold for a "getting old" warning (30 days in ms). */
export const AGE_WARN_MS = 30 * 24 * 60 * 60 * 1000;
/** Age threshold for a "stale / slam-dunk delete" warning (90 days in ms). */
export const AGE_STALE_MS = 90 * 24 * 60 * 60 * 1000;

export type ArtifactColorKey = 'green' | 'cyan' | 'blue' | 'yellow' | 'gray' | 'red' | 'magenta';

export type CleanPolicy = 'auto' | 'locked' | 'inspect';

/**
 * High-level category of a disk entry, set by the scan provider that produced
 * it. Lets the orchestrator, renderers, and TUI stay category-agnostic.
 */
export type EntryCategory =
  | 'artifact'
  | 'system-cache'
  | 'browser-cache'
  | 'app-cache'
  | 'log'
  | 'trash'
  | 'installer'
  | 'large-file'
  | 'docker';

/** A short, human-meaningful tag computed from an entry (e.g. "stale 90d+"). */
export interface Insight {
  /** Stable key for styling/testing, e.g. "stale", "rebuildable". */
  key: string;
  /** Display label, e.g. "stale 90d+". */
  label: string;
  /** Severity for coloring: info (neutral), good (safe to clean), warn. */
  tone: 'info' | 'good' | 'warn';
}

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
  /** Cleanup policy for this specific path. Scanner output always sets this. */
  cleanPolicy?: CleanPolicy;
  /** Short explanation shown when cleanup is locked or inspect-only. */
  cleanReason?: string;
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
  /** Category of this entry, set by the producing scan provider. */
  category: EntryCategory;
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
