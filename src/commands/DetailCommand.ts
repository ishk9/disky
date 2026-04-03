import * as readline from 'readline';
import * as path from 'path';
import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
import { DiskScanner } from '../core/DiskScanner';
import { ScanCache } from '../core/ScanCache';
import { DetailRenderer } from '../renderers/DetailRenderer';
import { Colors } from '../renderers/Colors';
import { DiskEntry } from '../types';

interface DetailCommandOptions {
  /** Numeric ID from the last scan table. Takes priority over path. */
  id?: number;
  /** Absolute or ~ path of the directory. */
  targetPath?: string;
}

/**
 * Handles `disky <id>` and `disky <path>`.
 * Tries to resolve from the scan cache first; falls back to a live scan.
 */
export class DetailCommand implements ICommand {
  private readonly scanner: IScanner;
  private readonly cache: ScanCache;
  private readonly renderer: DetailRenderer;

  constructor(
    private readonly options: DetailCommandOptions,
    scanner?: IScanner,
  ) {
    this.scanner = scanner ?? new DiskScanner();
    this.cache = new ScanCache();
    this.renderer = new DetailRenderer();
  }

  async execute(): Promise<void> {
    const entry = await this.resolveEntry();

    if (!entry) {
      const target = this.options.id !== undefined
        ? `ID ${this.options.id}`
        : (this.options.targetPath ?? 'unknown');
      console.log(`\n  ${Colors.error(`No entry found for ${target}`)}\n`);
      return;
    }

    console.log(this.renderer.render(entry));

    if (!entry.isDockerEntry) {
      const confirmed = await this.promptDelete(entry);
      if (confirmed) {
        await this.removeEntry(entry);
      }
    }
  }

  private async resolveEntry(): Promise<DiskEntry | null> {
    // 1. Try cache first (fast path)
    if (this.options.id !== undefined) {
      const cached = this.cache.findById(this.options.id);
      if (cached) {
        // Re-scan to get full entry with top offenders
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

    // 2. Fall back to a live scan
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

  private expandPath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(process.env.HOME ?? '', p.slice(2));
    }
    return path.resolve(p);
  }

  private promptDelete(entry: DiskEntry): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const label = entry.artifactType.label;
      const loc   = entry.project ?? entry.displayPath;

      rl.question(
        `  ${Colors.prompt(`Delete ${label} at ${loc}? [y/N]`)} `,
        (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === 'y');
        },
      );
    });
  }

  private async removeEntry(entry: DiskEntry): Promise<void> {
    const { execSync } = await import('child_process');
    try {
      execSync(`rm -rf "${entry.absolutePath}"`, { stdio: 'pipe' });
      console.log(
        `\n  ${Colors.success('✓')} Removed ${Colors.artifact(entry.artifactType.color)(entry.artifactType.label)} ` +
        `${Colors.dim(entry.displayPath)}\n`,
      );
    } catch {
      console.log(`\n  ${Colors.error('✗')} Failed to remove ${entry.displayPath}\n`);
    }
  }
}
