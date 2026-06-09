/**
 * Sizes directories on disk. The one place that knows how bytes are measured
 * (today: `du`). Domain code depends on this interface, not on `du`, so the
 * scanner is unit-testable with an in-memory fake.
 */
export interface ChildSize {
  /** Absolute path of the child. */
  path: string;
  sizeBytes: number;
}

export interface IDirSizer {
  /**
   * Total size in bytes for each path, computed concurrently. Paths that error
   * or do not exist resolve to 0. `onSized` (if given) is invoked once per path
   * as it completes, for progress reporting.
   */
  sizes(
    paths: string[],
    onSized?: (path: string, bytes: number) => void,
  ): Promise<Map<string, number>>;

  /** Immediate children of `dir` with their sizes (for top-offender breakdowns). */
  childSizes(dir: string): Promise<ChildSize[]>;

  /** Synchronous variant of {@link childSizes} for one-at-a-time entry building. */
  childSizesSync(dir: string): ChildSize[];
}
