import * as readline from 'readline';
import * as path from 'path';
import { IScanner } from '../interfaces/IScanner.js';
import { ScanCache } from './ScanCache.js';
import { Config } from './Config.js';
import { DiskEntry } from '../types/index.js';

/** Expands ~ paths and resolves relative paths to absolute. */
export function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(process.env.HOME ?? '', p.slice(2));
  }
  return path.resolve(p);
}

/** Interactive y/N prompt. Returns true only if user types "y". */
export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

/** Resolves a DiskEntry by numeric ID or path, using cache then live scan. */
export async function resolveEntry(
  opts: { id?: number; targetPath?: string },
  scanner: IScanner,
  cache: ScanCache,
): Promise<DiskEntry | null> {
  // Try cache first
  if (opts.id !== undefined) {
    const cached = cache.findById(opts.id);
    if (cached) {
      const entries = await scanner.scan(true);
      cache.save(entries);
      return entries.find((e) => e.absolutePath === cached.absolutePath) ?? null;
    }
  }

  if (opts.targetPath) {
    const absPath = expandPath(opts.targetPath);
    const cached = cache.findByPath(absPath);
    if (cached) {
      const entries = await scanner.scan(true);
      cache.save(entries);
      return entries.find((e) => e.absolutePath === absPath) ?? null;
    }
  }

  // Live scan fallback
  const entries = await scanner.scan(true);
  cache.save(entries);

  if (opts.id !== undefined) {
    return entries.find((e) => e.id === opts.id) ?? null;
  }
  if (opts.targetPath) {
    const absPath = expandPath(opts.targetPath);
    return entries.find((e) => e.absolutePath === absPath) ?? null;
  }

  return null;
}

/** Checks if an entry's path matches any exclusion path. */
export function isExcluded(entry: DiskEntry, exclusions: string[]): boolean {
  if (entry.isDockerEntry) return false;
  return exclusions.some((ex) =>
    entry.absolutePath === ex || entry.absolutePath.startsWith(ex + path.sep),
  );
}

/** Merges config-file exclusions with CLI-provided exclusion paths. */
export function getEffectiveExclusions(config: Config, cliPaths?: string[]): string[] {
  const configExclusions = config.getExclusions();
  const cliExclusions = (cliPaths ?? []).map((p) => expandPath(p));
  return [...new Set([...configExclusions, ...cliExclusions])];
}
