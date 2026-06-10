import { execFileSync } from 'child_process';
import { DiskEntry } from '../types/index.js';
import { isAutoCleanable, canForceClean } from '../core/CleanPolicy.js';
import {
  ICleaner,
  CleanOptions,
  RemovalResult,
  removalFailure,
  removalSuccess,
} from './ICleaner.js';

/** Locations that must never be removed (SIP / OS-owned). */
const PROTECTED_PREFIXES = ['/System', '/usr', '/bin', '/sbin', '/Library/Apple', '/private'];

/**
 * Removes an app bundle or one of its remnant files. Refuses any path under a
 * system-owned location regardless of policy — uninstalling must never touch
 * the OS.
 */
export class AppUninstaller implements ICleaner {
  readonly name = 'app';

  canClean(entry: DiskEntry): boolean {
    return entry.category === 'app';
  }

  clean(entry: DiskEntry, opts: CleanOptions): RemovalResult {
    if (isSystemPath(entry.absolutePath)) return removalFailure(entry);
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

export function isSystemPath(p: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}
