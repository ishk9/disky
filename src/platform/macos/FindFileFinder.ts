import { execSync, spawnSync } from 'child_process';
import { IFileFinder, FindDirsOptions, LargeDirsOptions } from '../IFileFinder.js';

/**
 * Locates directories with BSD `find` (by name) and `du` (by size).
 *
 * Uses spawnSync with an explicit args array to avoid shell quoting issues with
 * the `(` `)` grouping operators.
 */
export class FindFileFinder implements IFileFinder {
  findDirsByName(root: string, names: string[], opts: FindDirsOptions): string[] {
    if (names.length === 0) return [];

    // find ROOT -maxdepth N ( prunes ) -prune -o -type d ( target names ) -print -prune
    const args: string[] = [root, '-maxdepth', String(opts.maxDepth)];

    const pruneNames = opts.pruneNames ?? [];
    const prunePaths = opts.prunePaths ?? [];
    if (pruneNames.length > 0 || prunePaths.length > 0) {
      args.push('(');
      let hasPrune = false;
      const pushPrune = (kind: '-name' | '-path', value: string) => {
        if (hasPrune) args.push('-o');
        args.push(kind, value);
        hasPrune = true;
      };
      for (const name of pruneNames) pushPrune('-name', name);
      for (const p of prunePaths) pushPrune('-path', p);
      args.push(')', '-prune', '-o');
    }

    args.push('-type', 'd', '(');
    for (let i = 0; i < names.length; i++) {
      if (i > 0) args.push('-o');
      args.push('-name', names[i]);
    }
    args.push(')', '-print', '-prune');

    const result = spawnSync('find', args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.status !== 0 && !result.stdout) return [];

    return (result.stdout ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  largeDirs(root: string, opts: LargeDirsOptions): Array<[string, number]> {
    const results: Array<[string, number]> = [];
    try {
      const raw = execSync(`du -d ${opts.maxDepth} -k "${root}" 2>/dev/null | sort -rn`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 20 * 1024 * 1024,
      });

      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const tab = trimmed.indexOf('\t');
        if (tab === -1) continue;

        const kb = parseInt(trimmed.slice(0, tab), 10);
        const dirPath = trimmed.slice(tab + 1);
        const sizeBytes = kb * 1024;

        if (sizeBytes < opts.minBytes) continue;
        if (!dirPath || dirPath === root) continue;

        results.push([dirPath, sizeBytes]);
      }
    } catch {
      // du unavailable
    }
    return results;
  }
}
