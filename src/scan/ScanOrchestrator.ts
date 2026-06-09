import { DiskEntry } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import { IScanProvider } from './IScanProvider.js';

/**
 * Composes scan providers: runs them, merges their entries, dedupes by path,
 * assigns sequential IDs (in provider order), and returns them sorted by size.
 * Category-agnostic — adding a provider needs no change here (OCP).
 */
export class ScanOrchestrator {
  constructor(private readonly providers: IScanProvider[]) {}

  async scan(opts: ScanOptions = {}): Promise<DiskEntry[]> {
    const groups = await Promise.all(this.providers.map((p) => p.scan(opts)));
    const merged = groups.flat();

    // Dedupe by absolute path (Docker pseudo-entries are always kept).
    const seen = new Set<string>();
    const deduped = merged.filter((e) => {
      if (e.isDockerEntry) return true;
      if (seen.has(e.absolutePath)) return false;
      seen.add(e.absolutePath);
      return true;
    });

    // IDs reflect discovery order; the returned list is sorted by size.
    deduped.forEach((e, i) => {
      e.id = i + 1;
    });
    return deduped.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }
}
