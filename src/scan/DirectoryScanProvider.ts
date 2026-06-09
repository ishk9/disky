import * as fs from 'fs';
import * as path from 'path';
import { DiskEntry, EntryCategory, ArtifactColorKey, CleanPolicy } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import type { IDirSizer } from '../platform/IDirSizer.js';
import { IScanProvider } from './IScanProvider.js';
import { makeEntry } from './makeEntry.js';

/** Declarative description of a set of directories to scan. */
export interface DirectorySource {
  /** Absolute roots to scan (may not exist; missing roots are skipped). */
  roots: string[];
  /**
   * 'children' = each immediate subdirectory of a root is one entry;
   * 'self'     = each root is itself one entry.
   */
  mode: 'children' | 'self';
  color: ArtifactColorKey;
  policy: CleanPolicy;
  policyReason?: string;
  /** Fixed label; when omitted, the entry's basename is used. */
  label?: string;
  /** Skip entries below this size. */
  minBytes?: number;
}

/**
 * Config-driven scan provider for known directory sets (system caches, logs,
 * trash, …). New categories are added as data (a {@link DirectorySource}), not
 * new code (OCP). Produces entries via {@link makeEntry}, which applies the
 * protected-path safety net.
 */
export class DirectoryScanProvider implements IScanProvider {
  constructor(
    readonly category: EntryCategory,
    private readonly sources: DirectorySource[],
    private readonly dirSizer: IDirSizer,
  ) {}

  async scan(opts: ScanOptions): Promise<DiskEntry[]> {
    opts.onProgress?.({ phase: 'find', scanned: 0, total: 0, found: 0 });

    const candidates: Array<{ path: string; source: DirectorySource }> = [];
    for (const source of this.sources) {
      for (const root of source.roots) {
        if (!exists(root)) continue;
        if (source.mode === 'self') {
          candidates.push({ path: root, source });
        } else {
          for (const name of readChildren(root)) {
            candidates.push({ path: path.join(root, name), source });
          }
        }
      }
    }

    const paths = candidates.map((c) => c.path);
    let scanned = 0;
    let found = 0;
    const sizes = await this.dirSizer.sizes(paths, (p, bytes) => {
      scanned++;
      if (bytes > 0) found++;
      opts.onProgress?.({
        phase: 'size',
        scanned,
        total: paths.length,
        found,
        current: p,
      });
    });

    const entries: DiskEntry[] = [];
    for (const { path: absPath, source } of candidates) {
      const sizeBytes = sizes.get(absPath) ?? 0;
      if (sizeBytes === 0) continue;
      if (source.minBytes !== undefined && sizeBytes < source.minBytes) continue;

      entries.push(
        makeEntry({
          absPath,
          sizeBytes,
          category: this.category,
          artifactType: {
            label: source.label ?? path.basename(absPath),
            color: source.color,
            safeToClean: source.policy === 'auto',
            cleanPolicy: source.policy,
            cleanReason: source.policyReason,
          },
        }),
      );
    }
    return entries;
  }
}

function exists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readChildren(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}
