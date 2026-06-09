import { execSync, execFileSync } from 'child_process';
import { ICommand } from '../interfaces/ICommand.js';
import { IScanner } from '../interfaces/IScanner.js';
import { DiskScanner, formatBytes } from '../core/DiskScanner.js';
import { ScanCache } from '../core/ScanCache.js';
import { Config } from '../core/Config.js';
import { resolveEntry, promptConfirm, isExcluded, getEffectiveExclusions } from '../core/EntryResolver.js';
import { canForceClean, getCleanPolicy, isAutoCleanable } from '../core/CleanPolicy.js';
import { TableRenderer } from '../renderers/TableRenderer.js';
import { CleanRenderer, RemovalResult } from '../renderers/CleanRenderer.js';
import { Colors } from '../renderers/Colors.js';
import { DiskEntry } from '../types/index.js';

interface CleanCommandOptions {
  /** Numeric ID of a single entry to remove. Takes priority over targetPath. */
  id?: number;
  /** Path of a specific directory to remove. */
  targetPath?: string;
  /** Preview what would be deleted without removing anything. */
  dryRun?: boolean;
  /** CLI-provided paths to exclude from cleanup. */
  excludePaths?: string[];
  /** Allow targeted removal of locked entries. Never valid for bulk cleanup. */
  force?: boolean;
}

/**
 * Handles `disky clean`, `disky clean <id>`, and `disky clean <path>`.
 */
export class CleanCommand implements ICommand {
  private readonly scanner: IScanner;
  private readonly cache: ScanCache;
  private readonly config: Config;
  private readonly cleanRenderer: CleanRenderer;
  private readonly tableRenderer: TableRenderer;

  constructor(
    private readonly options: CleanCommandOptions = {},
    scanner?: IScanner,
  ) {
    this.scanner = scanner ?? new DiskScanner();
    this.cache = new ScanCache();
    this.config = new Config();
    this.cleanRenderer = new CleanRenderer();
    this.tableRenderer = new TableRenderer();
  }

  async execute(): Promise<void> {
    if (this.options.force && this.options.id === undefined && this.options.targetPath === undefined) {
      console.log(`\n  ${Colors.error('--force requires a target ID or path. Bulk force cleanup is not supported.')}\n`);
      return;
    }

    if (this.options.id !== undefined || this.options.targetPath !== undefined) {
      await this.removeSpecific();
    } else {
      await this.removeBulk();
    }
  }

  // ─── Specific entry removal ───────────────────────────────────────────────

  private async removeSpecific(): Promise<void> {
    const entry = await resolveEntry(this.options, this.scanner, this.cache);

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
    const policy = getCleanPolicy(entry.artifactType);
    const exclusions = getEffectiveExclusions(this.config, this.options.excludePaths);
    const excluded = isExcluded(entry, exclusions);

    if (this.options.dryRun) {
      if (excluded) {
        console.log(`  ${Colors.prompt('[DRY RUN]')} ${loc} is in your exclusion list — would be skipped`);
      } else if (policy === 'locked' && !this.options.force) {
        console.log(`  ${Colors.prompt('[DRY RUN]')} ${loc} is locked — would be skipped`);
        console.log(`  ${Colors.dim(entry.artifactType.cleanReason ?? 'Use --force with a target to remove it.')}`);
      } else if (policy === 'inspect') {
        console.log(`  ${Colors.prompt('[DRY RUN]')} ${loc} is inspect-only — would be skipped`);
        console.log(`  ${Colors.dim(entry.artifactType.cleanReason ?? 'Review it manually before removing anything.')}`);
      } else {
        const action = policy === 'locked' ? 'Would force delete' : 'Would delete';
        console.log(`  ${Colors.prompt('[DRY RUN]')} ${action} ${label} at ${loc} (${entry.sizeHuman})`);
      }
      console.log(`  ${Colors.dim('No files were modified.')}\n`);
      return;
    }

    if (policy === 'inspect') {
      console.log(`  ${Colors.dim('Inspect-only entry.')} ${entry.artifactType.cleanReason ?? 'Review it manually before removing anything.'}\n`);
      return;
    }

    if (policy === 'locked' && !this.options.force) {
      console.log(`  ${Colors.dim('Locked entry.')} ${entry.artifactType.cleanReason ?? 'Default clean skips this entry.'}`);
      console.log(`  ${Colors.dim(`Use disky clean ${entry.id} --force if you really want to remove it.`)}\n`);
      return;
    }

    let promptText = `Delete ${label} at ${loc}? [y/N]`;
    if (policy === 'locked' && this.options.force) {
      promptText = `Force delete locked ${label} at ${loc}? [y/N]`;
    }
    if (excluded) {
      promptText = `${loc} is in your exclusion list. Remove anyway? [y/N]`;
    }

    const confirmed = await promptConfirm(`  ${Colors.prompt(promptText)} `);

    if (!confirmed) {
      console.log(`\n  ${Colors.dim('Aborted.')}\n`);
      return;
    }

    const result = this.remove(entry, { force: this.options.force });
    if (result) {
      console.log(this.cleanRenderer.renderRemovalResults([result]));
    }
  }

  // ─── Bulk removal ─────────────────────────────────────────────────────────

  private async removeBulk(): Promise<void> {
    const entries = await this.scanner.scan(true);
    this.cache.save(entries);

    let safeEntries = entries.filter(isAutoCleanable);
    const lockedCount = entries.filter((e) => getCleanPolicy(e.artifactType) === 'locked').length;
    const inspectCount = entries.filter((e) => getCleanPolicy(e.artifactType) === 'inspect').length;

    // Apply exclusions
    const exclusions = getEffectiveExclusions(this.config, this.options.excludePaths);
    const excludedCount = safeEntries.filter((e) => isExcluded(e, exclusions)).length;
    safeEntries = safeEntries.filter((e) => !isExcluded(e, exclusions));

    process.stdout.write(this.cleanRenderer.render(safeEntries));

    if (excludedCount > 0) {
      console.log(`  ${Colors.dim(`Skipping ${excludedCount} excluded ${excludedCount === 1 ? 'entry' : 'entries'}`)}\n`);
    }
    if (lockedCount > 0 || inspectCount > 0) {
      const parts = [
        lockedCount > 0 ? `${lockedCount} locked` : null,
        inspectCount > 0 ? `${inspectCount} inspect-only` : null,
      ].filter(Boolean);
      console.log(`  ${Colors.dim(`Skipping ${parts.join(' and ')} ${lockedCount + inspectCount === 1 ? 'entry' : 'entries'}`)}\n`);
    }

    if (safeEntries.length === 0) return;

    if (this.options.dryRun) {
      const totalBytes = safeEntries.reduce((sum, e) => sum + e.sizeBytes, 0);
      console.log(`  ${Colors.prompt('[DRY RUN]')} Would remove ${safeEntries.length} ${safeEntries.length === 1 ? 'entry' : 'entries'} totaling ${formatBytes(totalBytes)}`);
      console.log(`  ${Colors.dim('No files were modified.')}\n`);
      return;
    }

    const confirmed = await promptConfirm(`  ${Colors.prompt('Remove all? [y/N]')} `);

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

  /**
   * Removes an entry from disk (or prunes Docker resources) and returns the result.
   * Returns null on failure.
   */
  private remove(entry: DiskEntry, options: { force?: boolean } = {}): RemovalResult | null {
    try {
      if (entry.isDockerEntry) {
        execSync('docker system prune -f 2>/dev/null', { stdio: 'pipe' });
      } else if (!isAutoCleanable(entry) && !(options.force && canForceClean(entry))) {
        return null;
      } else {
        execFileSync('rm', ['-rf', entry.absolutePath], { stdio: 'pipe' });
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

}
