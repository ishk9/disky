import { DiskEntry } from '../types/index.js';

export interface CleanOptions {
  /** Allow removal of an entry whose policy is `locked` (targeted only). */
  force?: boolean;
  /** Preview the operation without invoking the underlying remover. */
  dryRun?: boolean;
}

/** Outcome of attempting to remove one entry. */
export interface RemovalResult {
  id: number;
  label: string;
  displayPath: string;
  /** Bytes freed (0 on failure). */
  bytesFreed: number;
  success: boolean;
}

/**
 * Removes one kind of entry. New removal kinds (trash, app uninstall, …) are
 * added as new strategies and registered with the CleanService — no edits to
 * the orchestration code (OCP).
 */
export interface ICleaner {
  readonly name: string;
  /** Whether this cleaner handles the given entry. */
  canClean(entry: DiskEntry): boolean;
  /** Remove the entry. Implementations must never throw — return success:false. */
  clean(entry: DiskEntry, opts: CleanOptions): RemovalResult;
}

/** Builds a uniform failure result for an entry. */
export function removalFailure(entry: DiskEntry): RemovalResult {
  return {
    id: entry.id,
    label: entry.artifactType.label,
    displayPath: entry.displayPath,
    bytesFreed: 0,
    success: false,
  };
}

/** Builds a uniform success result for an entry. */
export function removalSuccess(entry: DiskEntry): RemovalResult {
  return {
    id: entry.id,
    label: entry.artifactType.label,
    displayPath: entry.displayPath,
    bytesFreed: entry.sizeBytes,
    success: true,
  };
}

/** Builds a uniform dry-run success result. */
export function removalDryRun(entry: DiskEntry): RemovalResult {
  return {
    id: entry.id,
    label: entry.artifactType.label,
    displayPath: entry.displayPath,
    bytesFreed: 0,
    success: true,
  };
}
