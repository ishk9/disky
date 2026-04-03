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
}

/**
 * Handles `disky` and `disky --all`.
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
    const entries = await this.scanner.scan(this.options.artifactOnly);

    this.cache.save(entries);

    console.log('\n' + this.headerRenderer.render());
    console.log('');

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
    const totalBytes = entries.reduce((sum: number, e) => sum + e.sizeBytes, 0);
    const totalHuman = formatBytes(totalBytes);

    const parts: string[] = [`${totalHuman} recoverable`, 'Run disky <id> for details'];

    if (this.options.artifactOnly) {
      parts.push('disky clean to free space');
    }

    return '  ' + Colors.dim(parts.join('  ·  '));
  }
}
