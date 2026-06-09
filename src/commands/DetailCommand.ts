import { ICommand } from '../interfaces/ICommand.js';
import { IScanner } from '../interfaces/IScanner.js';
import { DiskScanner } from '../core/DiskScanner.js';
import { ScanCache } from '../core/ScanCache.js';
import { Config } from '../core/Config.js';
import {
  resolveEntry,
  promptConfirm,
  isExcluded,
  getEffectiveExclusions,
} from '../core/EntryResolver.js';
import { getCleanPolicy } from '../core/CleanPolicy.js';
import { DetailRenderer } from '../renderers/DetailRenderer.js';
import { Colors } from '../renderers/Colors.js';
import { DiskEntry } from '../types/index.js';

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
  private readonly config: Config;
  private readonly renderer: DetailRenderer;

  constructor(
    private readonly options: DetailCommandOptions,
    scanner?: IScanner,
  ) {
    this.scanner = scanner ?? new DiskScanner();
    this.cache = new ScanCache();
    this.config = new Config();
    this.renderer = new DetailRenderer();
  }

  async execute(): Promise<void> {
    const entry = await resolveEntry(this.options, this.scanner, this.cache);

    if (!entry) {
      const target =
        this.options.id !== undefined
          ? `ID ${this.options.id}`
          : (this.options.targetPath ?? 'unknown');
      console.log(`\n  ${Colors.error(`No entry found for ${target}`)}\n`);
      return;
    }

    console.log(this.renderer.render(entry));

    if (!entry.isDockerEntry) {
      const label = entry.artifactType.label;
      const loc = entry.project ?? entry.displayPath;
      const policy = getCleanPolicy(entry.artifactType);

      if (policy !== 'auto') {
        console.log(
          `  ${Colors.dim(policy === 'locked' ? 'Locked entry.' : 'Inspect-only entry.')} ${entry.artifactType.cleanReason ?? 'Default clean skips this entry.'}`,
        );
        if (policy === 'locked') {
          console.log(
            `  ${Colors.dim(`Use disky clean ${entry.id} --force if you really want to remove it.`)}`,
          );
        }
        console.log('');
        return;
      }

      const exclusions = getEffectiveExclusions(this.config);
      const excluded = isExcluded(entry, exclusions);

      let promptText = `Delete ${label} at ${loc}? [y/N]`;
      if (excluded) {
        promptText = `${loc} is in your exclusion list. Remove anyway? [y/N]`;
      }

      const confirmed = await promptConfirm(`  ${Colors.prompt(promptText)} `);
      if (confirmed) {
        await this.removeEntry(entry);
      }
    }
  }

  private async removeEntry(entry: DiskEntry): Promise<void> {
    const { execFileSync } = await import('child_process');
    try {
      execFileSync('rm', ['-rf', entry.absolutePath], { stdio: 'pipe' });
      console.log(
        `\n  ${Colors.success('✓')} Removed ${Colors.artifact(entry.artifactType.color)(entry.artifactType.label)} ` +
          `${Colors.dim(entry.displayPath)}\n`,
      );
    } catch {
      console.log(`\n  ${Colors.error('✗')} Failed to remove ${entry.displayPath}\n`);
    }
  }
}
