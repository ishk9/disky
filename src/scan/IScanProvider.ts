import { DiskEntry, EntryCategory } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';

/**
 * Produces disk entries of one category. New categories (caches, logs, large
 * files, …) are added as new providers and registered with the
 * {@link ScanOrchestrator} — no edits to orchestration code (OCP).
 */
export interface IScanProvider {
  readonly category: EntryCategory;
  scan(opts: ScanOptions): Promise<DiskEntry[]>;
}
