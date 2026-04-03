import * as readline from 'readline';
import * as path from 'path';
import { execSync } from 'child_process';
import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
import { DiskScanner } from '../core/DiskScanner';
import { ScanCache } from '../core/ScanCache';
import { TableRenderer } from '../renderers/TableRenderer';
import { CleanRenderer, RemovalResult } from '../renderers/CleanRenderer';
import { Colors } from '../renderers/Colors';
import { DiskEntry } from '../types';

interface CleanCommandOptions {
  /** Numeric ID of a single entry to remove. Takes priority over targetPath. */
  id?: number;
  /** Path of a specific directory to remove. */
  targetPath?: string;
}

/**
 * Handles `disky clean`, `disky clean <id>`, and `disky clean <path>`.
 */
export class CleanCommand implements ICommand {
  private readonly scanner: IScanner;
  private readonly cache: ScanCache;
  private readonly cleanRenderer: CleanRenderer;
  private readonly tableRenderer: TableRenderer;

  constructor(
    private readonly options: CleanCommandOptions = {},
    scanner?: IScanner,
  ) {
    this.scanner = scanner ?? new DiskScanner();
    this.cache = new ScanCache();
    this.cleanRenderer = new CleanRenderer();
    this.tableRenderer = new TableRenderer();
  }

  async execute(): Promise<void> {
    if (this.options.id !== undefined || this.options.targetPath !== undefined) {
      await this.removeSpecific();
    } else {
      await this.removeBulk();
    }
  }

  // ─── Specific entry removal ───────────────────────────────────────────────

  private async removeSpecific(): Promise<void> {
    const entry = await this.resolveEntry();

    if (!entry) {
      const target = this.options.id !== undefined
        ? `ID ${this.options.id}`
        : (this.options.targetPath ?? 'unknown');
      console.log(`\n  ${Colors.error(`No entry found for ${target}`)}\n`);
      return;
    }

    console.log('\n' + this.tableRenderer.render([entry]));
    console.log('');

    const label = entry.artifactType.label;
    const loc   = entry.project ?? entry.displayPath;
    const confirmed = await this.prompt(
      `  ${Colors.prompt(`Delete ${label} at ${loc}? [y/N]`)} `,
    );

    if (!confirmed) {
      console.log(`\n  ${Colors.dim('Aborted.')}\n`);
      return;
    }

    const result = this.remove(entry);
    if (result) {
      console.log(this.cleanRenderer.renderRemovalResults([result]));
    }
  }

  // ─── Bulk removal ─────────────────────────────────────────────────────────

  private async removeBulk(): Promise<void> {
    const entries = await this.scanner.scan(true);
    this.cache.save(entries);

    const safeEntries = entries.filter((e) => e.artifactType.safeToClean);

    process.stdout.write(this.cleanRenderer.render(safeEntries));

    if (safeEntries.length === 0) return;

    const confirmed = await this.prompt(`  ${Colors.prompt('Remove all? [y/N]')} `);

    if (!confirmed) {
      console.log(`\n  ${Colors.dim('Aborted.')}\n`);
      return;
    }

    const results: RemovalResult[] = [];
    for (const entry of safeEntries) {
      const result = this.remove(entry);
      if (result) {
        results.push(result);
      } else {
        console.log(`  ${Colors.error('✗')} Failed to remove ${entry.displayPath}`);
      }
    }

    console.log(this.cleanRenderer.renderRemovalResults(results));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async resolveEntry(): Promise<DiskEntry | null> {
    // Try cache first
    if (this.options.id !== undefined) {
      const cached = this.cache.findById(this.options.id);
      if (cached) {
        const entries = await this.scanner.scan(true);
        this.cache.save(entries);
        return entries.find((e) => e.absolutePath === cached.absolutePath) ?? null;
      }
    }

    if (this.options.targetPath) {
      const absPath = this.expandPath(this.options.targetPath);
      const cached = this.cache.findByPath(absPath);
      if (cached) {
        const entries = await this.scanner.scan(true);
        this.cache.save(entries);
        return entries.find((e) => e.absolutePath === absPath) ?? null;
      }
    }

    // Live scan fallback
    const entries = await this.scanner.scan(true);
    this.cache.save(entries);

    if (this.options.id !== undefined) {
      return entries.find((e) => e.id === this.options.id) ?? null;
    }
    if (this.options.targetPath) {
      const absPath = this.expandPath(this.options.targetPath);
      return entries.find((e) => e.absolutePath === absPath) ?? null;
    }

    return null;
  }

  /**
   * Removes an entry from disk (or prunes Docker resources) and returns the result.
   * Returns null on failure.
   */
  private remove(entry: DiskEntry): RemovalResult | null {
    try {
      if (entry.isDockerEntry) {
        execSync('docker system prune -f 2>/dev/null', { stdio: 'pipe' });
      } else {
        execSync(`rm -rf "${entry.absolutePath}"`, { stdio: 'pipe' });
      }

      return {
        id: entry.id,
        label: entry.artifactType.label,
        displayPath: entry.displayPath,
        bytesFreed: entry.sizeBytes,
      };
    } catch {
      return null;
    }
  }

  private expandPath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(process.env.HOME ?? '', p.slice(2));
    }
    return path.resolve(p);
  }

  private prompt(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y');
      });
    });
  }
}
