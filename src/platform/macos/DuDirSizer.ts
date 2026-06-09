import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { IDirSizer, ChildSize } from '../IDirSizer.js';

const execFileAsync = promisify(execFile);

/** Max concurrent `du` processes; keep this modest to avoid I/O thrash. */
const DU_CONCURRENCY = 8;

/**
 * Sizes directories with `du -sk`, run in a bounded concurrent pool.
 *
 * Empirically a single `du -sk path1 path2 …` and N sequential `du -sk path`
 * calls finish in roughly the same wall clock on macOS — `du` is the
 * bottleneck, not process spawn. The win comes from running several `du`
 * processes in parallel so the OS can pipeline disk I/O.
 */
export class DuDirSizer implements IDirSizer {
  async sizes(paths: string[]): Promise<Map<string, number>> {
    const sizes = new Map<string, number>();
    if (paths.length === 0) return sizes;

    let cursor = 0;
    const workers = Array.from({ length: Math.min(DU_CONCURRENCY, paths.length) }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= paths.length) return;
        const p = paths[idx];
        try {
          const { stdout } = await execFileAsync('du', ['-sk', p], {
            encoding: 'utf8',
            maxBuffer: 4 * 1024 * 1024,
          });
          const kb = parseInt(stdout.split('\t')[0] ?? '0', 10);
          if (!isNaN(kb)) sizes.set(p, kb * 1024);
        } catch {
          sizes.set(p, 0);
        }
      }
    });
    await Promise.all(workers);

    return sizes;
  }

  async childSizes(dir: string): Promise<ChildSize[]> {
    const children = this.readChildren(dir);
    if (children.length === 0) return [];
    try {
      const { stdout } = await execFileAsync('du', ['-sk', ...children], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
      });
      return parseDuLines(stdout);
    } catch (err) {
      return parseDuLines(stdoutFromExecError(err));
    }
  }

  childSizesSync(dir: string): ChildSize[] {
    const children = this.readChildren(dir);
    if (children.length === 0) return [];
    try {
      const raw = execFileSync('du', ['-sk', ...children], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return parseDuLines(raw);
    } catch (err) {
      return parseDuLines(stdoutFromExecError(err));
    }
  }

  private readChildren(dir: string): string[] {
    try {
      return fs.readdirSync(dir).map((name) => path.join(dir, name));
    } catch {
      return [];
    }
  }
}

/** Parses `du -k` output ("<kb>\t<path>") into child sizes (bytes). */
function parseDuLines(raw: string): ChildSize[] {
  const out: ChildSize[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tab = trimmed.indexOf('\t');
    if (tab === -1) continue;
    const kb = parseInt(trimmed.slice(0, tab), 10);
    if (isNaN(kb)) continue;
    out.push({ path: trimmed.slice(tab + 1), sizeBytes: kb * 1024 });
  }
  return out;
}

function stdoutFromExecError(err: unknown): string {
  const stdout = (err as { stdout?: unknown }).stdout;
  if (typeof stdout === 'string') return stdout;
  if (Buffer.isBuffer(stdout)) return stdout.toString('utf8');
  return '';
}
