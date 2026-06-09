import { execFileSync } from 'child_process';
import { DiskEntry } from '../types/index.js';
import { canForceClean, isAutoCleanable } from '../core/CleanPolicy.js';
import {
  ICleaner,
  CleanOptions,
  RemovalResult,
  removalFailure,
  removalSuccess,
} from './ICleaner.js';

/**
 * Removes a filesystem entry with `rm -rf`, gated by the clean policy: only
 * auto-cleanable entries are removed unless `force` is set on a force-eligible
 * (locked) entry.
 */
export class FilesystemCleaner implements ICleaner {
  readonly name = 'filesystem';

  canClean(entry: DiskEntry): boolean {
    return !entry.isDockerEntry;
  }

  clean(entry: DiskEntry, opts: CleanOptions): RemovalResult {
    if (!isAutoCleanable(entry) && !(opts.force && canForceClean(entry))) {
      return removalFailure(entry);
    }
    try {
      execFileSync('rm', ['-rf', entry.absolutePath], { stdio: 'pipe' });
      return removalSuccess(entry);
    } catch {
      return removalFailure(entry);
    }
  }
}
