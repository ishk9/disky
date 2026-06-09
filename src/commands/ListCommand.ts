import { ICommand } from '../interfaces/ICommand.js';
import { IScanner } from '../interfaces/IScanner.js';
import { DiskEntry } from '../types/index.js';
import { DiskScanner, formatBytes } from '../core/DiskScanner.js';
import { ScanCache } from '../core/ScanCache.js';
import { HeaderRenderer } from '../renderers/HeaderRenderer.js';
import { TableRenderer } from '../renderers/TableRenderer.js';
import { Colors } from '../renderers/Colors.js';
import { getCleanPolicy, isAutoCleanable } from '../core/CleanPolicy.js';

interface ListCommandOptions {
  /** When false, show all large directories (--all mode). */
  artifactOnly: boolean;
  /**
   * Optional minimum size in bytes. Only entries at or above this threshold
   * are shown. Parses strings like "500MB", "1.5GB", "100KB".
   */
  minBytes?: number;
  /** Sort mode: size (default), age (oldest first), or type (grouped by label). */
  sortMode?: 'size' | 'age' | 'type';
  /** Output results as JSON instead of a formatted table. */
  json?: boolean;
  /** Limit output to the top N entries. */
  top?: number;
}

/**
 * Handles `disky scan`, `disky scan --all`, and `disky scan --min <size>`.
 */
export class ListCommand implements ICommand {
  private readonly scanner: IScanner;
  private readonly cache: ScanCache;
  private readonly headerRenderer: HeaderRenderer;
  private readonly tableRenderer: TableRenderer;

  constructor(
    private readonly options: ListCommandOptions,
    scanner?: IScanner,
  ) {
    this.scanner = scanner ?? new DiskScanner();
    this.cache = new ScanCache();
    this.headerRenderer = new HeaderRenderer();
    this.tableRenderer = new TableRenderer();
  }

  async execute(): Promise<void> {
    let entries = await this.scanner.scan(this.options.artifactOnly, {
      includeTopOffenders: this.options.json === true,
    });

    if (this.options.minBytes !== undefined && this.options.minBytes > 0) {
      entries = entries.filter((e) => e.sizeBytes >= this.options.minBytes!);
    }

    this.sortEntries(entries);

    // Reassign sequential IDs after sorting so disky <id> matches displayed order
    entries.forEach((e, i) => { e.id = i + 1; });

    this.cache.save(entries);

    if (this.options.top !== undefined && this.options.top > 0) {
      entries = entries.slice(0, this.options.top);
    }

    // JSON output: no colors, no table chrome — just the data
    if (this.options.json) {
      process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
      return;
    }

    console.log('\n' + this.headerRenderer.render());
    console.log('');

    if (this.options.minBytes) {
      console.log(`  ${Colors.dim(`Showing entries ≥ ${formatBytes(this.options.minBytes)}`)}`);
      console.log('');
    }

    if (entries.length === 0) {
      console.log(`  ${Colors.dim('No disk hogs found.')}`);
    } else {
      console.log(this.tableRenderer.render(entries));
    }

    console.log('');
    console.log(this.buildFooter(entries));
    console.log('');
  }

  private sortEntries(entries: DiskEntry[]): void {
    const mode = this.options.sortMode ?? 'size';
    switch (mode) {
      case 'age':
        entries.sort((a, b) => b.ageMs - a.ageMs);
        break;
      case 'type':
        entries.sort((a, b) =>
          a.artifactType.label.localeCompare(b.artifactType.label) || b.sizeBytes - a.sizeBytes,
        );
        break;
      case 'size':
      default:
        entries.sort((a, b) => b.sizeBytes - a.sizeBytes);
        break;
    }
  }

  private buildFooter(entries: DiskEntry[]): string {
    const recoverableBytes = entries.filter(isAutoCleanable).reduce((sum, e) => sum + e.sizeBytes, 0);
    const shownBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
    const lockedCount = entries.filter((e) => getCleanPolicy(e.artifactType) === 'locked').length;
    const inspectCount = entries.filter((e) => getCleanPolicy(e.artifactType) === 'inspect').length;
    const parts: string[] = [
      this.options.artifactOnly
        ? `${formatBytes(recoverableBytes)} recoverable`
        : `${formatBytes(shownBytes)} shown`,
      'Run disky <id> for details',
    ];

    if (this.options.artifactOnly) {
      parts.push('disky clean to free space');
    }
    if (lockedCount > 0) parts.push(`${lockedCount} locked`);
    if (inspectCount > 0) parts.push(`${inspectCount} inspect-only`);

    const sortMode = this.options.sortMode ?? 'size';
    if (sortMode !== 'size') {
      parts.push(`sorted by ${sortMode}`);
    }

    return '  ' + Colors.dim(parts.join('  ·  '));
  }
}

/**
 * Parses a human-readable size string into bytes.
 * Accepts: "500MB", "1.5GB", "100KB", "2048" (raw bytes).
 * Returns NaN if the string is not parseable.
 */
export function parseMinSize(input: string): number {
  const match = input.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return NaN;

  const value = parseFloat(match[1] ?? '0');
  // Default to MB when no unit given — bare numbers like "500" mean 500 MB
  const unit = (match[2] ?? 'MB').toUpperCase();

  const multipliers: Record<string, number> = {
    B:  1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  return Math.round(value * (multipliers[unit] ?? 1));
}
