import * as os from 'os';
import { DiskEntry } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import type { IFileFinder } from '../platform/IFileFinder.js';
import type { ProjectInfoCache } from '../core/ProjectDetector.js';
import { IScanProvider } from './IScanProvider.js';
import { EntryBuilder, largeDirArtifact } from './EntryBuilder.js';

/** Minimum directory size (bytes) to include in `--all` mode. */
const ALL_MODE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB

/** How deep to walk in `--all` mode. */
const ALL_SCAN_DEPTH = 3;

/** `--all` mode: any large directory under home, for inspection. */
export class LargeDirScanProvider implements IScanProvider {
  readonly category = 'large-file' as const;

  constructor(
    private readonly fileFinder: IFileFinder,
    private readonly builder: EntryBuilder,
  ) {}

  async scan(opts: ScanOptions): Promise<DiskEntry[]> {
    const includeTopOffenders = opts.includeTopOffenders ?? true;

    opts.onProgress?.({ phase: 'find', scanned: 0, total: 0, found: 0 });
    const largeDirs = this.fileFinder.largeDirs(os.homedir(), {
      maxDepth: ALL_SCAN_DEPTH,
      minBytes: ALL_MODE_THRESHOLD_BYTES,
    });

    const projectInfoCache: ProjectInfoCache = new Map();
    return largeDirs.map(([absPath, sizeBytes]) =>
      this.builder.build({
        absPath,
        sizeBytes,
        category: 'large-file',
        mode: 'all',
        topOffenders: includeTopOffenders ? undefined : [],
        projectInfoCache,
        fallbackArtifact: largeDirArtifact(),
      }),
    );
  }
}
