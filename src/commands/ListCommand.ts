import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
import { DiskEntry } from '../types';
import { DiskScanner, formatBytes } from '../core/DiskScanner';
import { ScanCache } from '../core/ScanCache';
import { HeaderRenderer } from '../renderers/HeaderRenderer';
import { TableRenderer } from '../renderers/TableRenderer';
import { Colors } from '../renderers/Colors';

interface ListCommandOptions {
  /** When false, show all large directories (--all mode). */
  artifactOnly: boolean;
  /**
   * Optional minimum size in bytes. Only entries at or above this threshold
   * are shown. Parses strings like "500MB", "1.5GB", "100KB".
   */
  minBytes?: number;
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
    let entries = await this.scanner.scan(this.options.artifactOnly);

    if (this.options.minBytes !== undefined && this.options.minBytes > 0) {
      entries = entries.filter((e) => e.sizeBytes >= this.options.minBytes!);
    }

    this.cache.save(entries);

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

  private buildFooter(entries: DiskEntry[]): string {
    const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
    const parts: string[] = [`${formatBytes(totalBytes)} recoverable`, 'Run disky <id> for details'];

    if (this.options.artifactOnly) {
      parts.push('disky clean to free space');
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
