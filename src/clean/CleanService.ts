import { DiskEntry } from '../types/index.js';
import { IOperationLog, OperationLog } from '../core/OperationLog.js';
import { ICleaner, CleanOptions, RemovalResult, removalFailure } from './ICleaner.js';
import { FilesystemCleaner } from './FilesystemCleaner.js';
import { DockerCleaner } from './DockerCleaner.js';

/**
 * Single entry point for all removals. Dispatches each entry to the first
 * cleaner that handles it and records the outcome to the operation log. Used by
 * both the CLI (`CleanCommand`) and the TUI (`useCleaner`) so there is exactly
 * one removal path — no duplicated `rm -rf`.
 */
export class CleanService {
  private readonly cleaners: ICleaner[];
  private readonly oplog: IOperationLog;

  constructor(cleaners?: ICleaner[], oplog: IOperationLog = new OperationLog()) {
    this.cleaners = cleaners ?? [new FilesystemCleaner(), new DockerCleaner()];
    this.oplog = oplog;
  }

  /** Remove one entry, recording the operation. Never throws. */
  clean(entry: DiskEntry, opts: CleanOptions = {}, op = 'clean'): RemovalResult {
    const cleaner = this.cleaners.find((c) => c.canClean(entry));
    const result = cleaner ? cleaner.clean(entry, opts) : removalFailure(entry);

    this.oplog.record({
      op,
      label: entry.artifactType.label,
      path: entry.absolutePath,
      bytes: result.bytesFreed,
      dryRun: false,
      success: result.success,
    });

    return result;
  }
}
