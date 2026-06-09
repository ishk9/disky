import { ICommand } from '../interfaces/ICommand.js';
import { IScanner } from '../interfaces/IScanner.js';
import { DiskScanner, formatBytes } from '../core/DiskScanner.js';
import { ScanCache } from '../core/ScanCache.js';
import { HeaderRenderer } from '../renderers/HeaderRenderer.js';
import { TableRenderer } from '../renderers/TableRenderer.js';
import { Colors } from '../renderers/Colors.js';
import { DiskEntry } from '../types/index.js';

const POLL_INTERVAL_MS = 5000;

/**
 * Handles `disky watch` — real-time terminal monitor with 5s polling.
 *
 * Highlights newly appeared entries in green for one cycle and
 * fades removed entries in red before they disappear.
 */
export class WatchCommand implements ICommand {
  private readonly scanner: IScanner;
  private readonly cache: ScanCache;
  private readonly headerRenderer: HeaderRenderer;
  private readonly tableRenderer: TableRenderer;

  private previousIds = new Set<number>();
  private previousEntries = new Map<number, DiskEntry>();

  constructor(scanner?: IScanner) {
    this.scanner = scanner ?? new DiskScanner();
    this.cache = new ScanCache();
    this.headerRenderer = new HeaderRenderer();
    this.tableRenderer = new TableRenderer();
  }

  async execute(): Promise<void> {
    process.on('SIGINT', () => {
      process.stdout.write('\x1b[?25h'); // restore cursor
      console.log(`\n  ${Colors.dim('Stopped watching.')}\n`);
      process.exit(0);
    });

    process.stdout.write('\x1b[?25l'); // hide cursor

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await this.tick();
      await this.sleep(POLL_INTERVAL_MS);
    }
  }

  private async tick(): Promise<void> {
    const entries = await this.scanner.scan(true);
    this.cache.save(entries);

    const currentMap = new Map(entries.map((e) => [e.id, e]));
    const currentIds = new Set(entries.map((e) => e.id));

    const newIds = new Set<number>();
    for (const id of currentIds) {
      if (!this.previousIds.has(id)) newIds.add(id);
    }

    const removedEntries: DiskEntry[] = [];
    for (const [id, entry] of this.previousEntries) {
      if (!currentIds.has(id)) removedEntries.push(entry);
    }

    this.previousIds = currentIds;
    this.previousEntries = currentMap;

    this.redraw(entries, newIds, removedEntries);
  }

  private redraw(entries: DiskEntry[], newIds: Set<number>, removedEntries: DiskEntry[]): void {
    console.clear();

    console.log('\n' + this.headerRenderer.render({ watchMode: true }));
    console.log('');

    if (entries.length === 0 && removedEntries.length === 0) {
      console.log(`  ${Colors.dim('No disk hogs found.')}`);
    } else {
      console.log(this.tableRenderer.render(entries, { newIds, removedEntries }));
    }

    console.log('');
    console.log(this.buildFooter(entries));
    console.log('');
  }

  private buildFooter(entries: DiskEntry[]): string {
    const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return '  ' + Colors.dim(`Last updated: ${time}  ·  ${formatBytes(totalBytes)} recoverable`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
