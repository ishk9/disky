/**
 * Locates directories on disk. The one place that knows how the filesystem is
 * walked (today: `find` and `du`). Domain code depends on this interface.
 */
export interface FindDirsOptions {
  maxDepth: number;
  /** Directory basenames whose subtrees are pruned (not descended into). */
  pruneNames?: string[];
  /** Absolute paths whose subtrees are pruned. */
  prunePaths?: string[];
}

export interface LargeDirsOptions {
  maxDepth: number;
  /** Minimum size in bytes for a directory to be returned. */
  minBytes: number;
}

export interface IFileFinder {
  /** Find directories matching any of `names` under `root`, honoring prunes. */
  findDirsByName(root: string, names: string[], opts: FindDirsOptions): string[];

  /** All directories under `root` at/above `minBytes`, as `[path, sizeBytes]`. */
  largeDirs(root: string, opts: LargeDirsOptions): Array<[string, number]>;

  /** Individual files under `root` at/above `minBytes`, sorted largest-first. */
  largeFiles(root: string, opts: LargeDirsOptions): Array<[string, number]>;
}
