import * as fs from 'fs';
import * as path from 'path';
import { DiskEntry } from '../types/index.js';
import { ScanOptions } from '../interfaces/IScanner.js';
import { IScanProvider } from './IScanProvider.js';
import { makeEntry } from './makeEntry.js';

const INSTALLER_EXTS = ['.dmg', '.pkg', '.iso', '.app.zip'];

/** Finds installer files (.dmg/.pkg/.iso) in download locations. */
export class InstallerScanProvider implements IScanProvider {
  readonly category = 'installer' as const;

  constructor(
    private readonly dirs: string[],
    private readonly exts: string[] = INSTALLER_EXTS,
  ) {}

  async scan(opts: ScanOptions): Promise<DiskEntry[]> {
    opts.onProgress?.({ phase: 'find', scanned: 0, total: 0, found: 0 });

    const entries: DiskEntry[] = [];
    for (const dir of this.dirs) {
      let names: string[];
      try {
        names = fs.readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of names) {
        const lower = name.toLowerCase();
        if (!this.exts.some((e) => lower.endsWith(e))) continue;
        const p = path.join(dir, name);
        try {
          const st = fs.statSync(p);
          if (!st.isFile()) continue;
          entries.push(
            makeEntry({
              absPath: p,
              sizeBytes: st.size,
              category: 'installer',
              ageMs: Date.now() - st.mtimeMs,
              artifactType: {
                label: path.extname(name).replace('.', '') || 'installer',
                color: 'yellow',
                safeToClean: true,
                cleanPolicy: 'auto',
                cleanReason: 'Installer file — re-downloadable.',
              },
            }),
          );
        } catch {
          // file vanished between readdir and stat
        }
      }
    }
    return entries;
  }
}
