import { CachedEntry, DiskEntry } from '../types';
/**
 * Persists the last scan result to ~/.disky/last-scan.json so that
 * `disky clean <id>` and `disky <id>` can resolve entries without re-scanning.
 */
export declare class ScanCache {
    private static readonly CACHE_DIR;
    private static readonly CACHE_FILE;
    save(entries: DiskEntry[]): void;
    load(): CachedEntry[];
    /** Returns the cached entry matching the given numeric ID, or null. */
    findById(id: number): CachedEntry | null;
    /** Returns the cached entry matching the given absolute path, or null. */
    findByPath(absolutePath: string): CachedEntry | null;
}
//# sourceMappingURL=ScanCache.d.ts.map