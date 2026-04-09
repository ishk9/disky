import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CachedEntry, DiskEntry } from '../types';
import { Colors } from '../renderers/Colors';

/**
 * Persists the last scan result to ~/.disky/last-scan.json so that
 * `disky clean <id>` and `disky <id>` can resolve entries without re-scanning.
 */
export class ScanCache {
  private static readonly CACHE_DIR = path.join(os.homedir(), '.disky');
  private static readonly CACHE_FILE = path.join(ScanCache.CACHE_DIR, 'last-scan.json');

  save(entries: DiskEntry[]): void {
    try {
      fs.mkdirSync(ScanCache.CACHE_DIR, { recursive: true });

      const cached: CachedEntry[] = entries.map((e) => ({
        id: e.id,
        absolutePath: e.absolutePath,
        isDockerEntry: e.isDockerEntry,
        sizeHuman: e.sizeHuman,
        artifactLabel: e.artifactType.label,
        project: e.project,
      }));

      fs.writeFileSync(ScanCache.CACHE_FILE, JSON.stringify(cached, null, 2), 'utf8');
    } catch (err) {
      console.error(`  ${Colors.warn('Warning:')} Could not write scan cache: ${err instanceof Error ? err.message : err}`);
    }
  }

  load(): CachedEntry[] {
    try {
      if (!fs.existsSync(ScanCache.CACHE_FILE)) return [];
      const raw = fs.readFileSync(ScanCache.CACHE_FILE, 'utf8');
      return JSON.parse(raw) as CachedEntry[];
    } catch (err) {
      console.error(`  ${Colors.warn('Warning:')} Could not read scan cache: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  /** Returns the cached entry matching the given numeric ID, or null. */
  findById(id: number): CachedEntry | null {
    return this.load().find((e) => e.id === id) ?? null;
  }

  /** Returns the cached entry matching the given absolute path, or null. */
  findByPath(absolutePath: string): CachedEntry | null {
    const normalised = path.resolve(absolutePath);
    return this.load().find((e) => e.absolutePath === normalised) ?? null;
  }
}
