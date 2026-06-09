import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
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
 * Empties a Trash directory by removing its *contents* (rather than the
 * `.Trash` directory itself, which macOS expects to exist).
 */
export class TrashCleaner implements ICleaner {
  readonly name = 'trash';

  canClean(entry: DiskEntry): boolean {
    return entry.category === 'trash';
  }

  clean(entry: DiskEntry, opts: CleanOptions): RemovalResult {
    if (!isAutoCleanable(entry) && !(opts.force && canForceClean(entry))) {
      return removalFailure(entry);
    }
    try {
      for (const name of fs.readdirSync(entry.absolutePath)) {
        execFileSync('rm', ['-rf', path.join(entry.absolutePath, name)], { stdio: 'pipe' });
      }
      return removalSuccess(entry);
    } catch {
      return removalFailure(entry);
    }
  }
}
