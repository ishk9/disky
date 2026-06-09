import { DiskEntry } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import type { IFileFinder } from '../platform/IFileFinder.js';
import { IScanProvider } from './IScanProvider.js';
import { makeEntry } from './makeEntry.js';

/**
 * Finds individual large files under a root. Files are classified `inspect` —
 * disky never auto-deletes arbitrary user files.
 */
export class LargeFileScanProvider implements IScanProvider {
  readonly category = 'large-file' as const;

  constructor(
    private readonly fileFinder: IFileFinder,
    private readonly root: string,
    private readonly minBytes: number,
    private readonly maxDepth = 8,
  ) {}

  async scan(opts: ScanOptions): Promise<DiskEntry[]> {
    opts.onProgress?.({ phase: 'find', scanned: 0, total: 0, found: 0 });
    const files = this.fileFinder.largeFiles(this.root, {
      maxDepth: this.maxDepth,
      minBytes: this.minBytes,
    });

    return files.map(([absPath, sizeBytes]) =>
      makeEntry({
        absPath,
        sizeBytes,
        category: 'large-file',
        artifactType: {
          label: 'large file',
          color: 'yellow',
          safeToClean: false,
          cleanPolicy: 'inspect',
          cleanReason: 'Review before deleting — disky does not auto-remove arbitrary files.',
        },
      }),
    );
  }
}
