import * as os from 'os';
import { ICommand } from '../interfaces/ICommand.js';
import { DiskEntry, Insight } from '../types/index.js';
import { macosPlatform } from '../platform/macos/index.js';
import { ScanOrchestrator } from '../scan/ScanOrchestrator.js';
import { LargeFileScanProvider } from '../scan/LargeFileScanProvider.js';
import { ProgressReporter } from '../io/ProgressReporter.js';
import { InsightEngine } from '../insights/InsightEngine.js';
import { diskUsage } from '../system/diskUsage.js';
import { expandPath } from '../core/EntryResolver.js';
import { Colors } from '../renderers/Colors.js';
import { formatBytes } from '../core/format.js';

interface AnalyzeCommandOptions {
  targetPath?: string;
  json?: boolean;
  minBytes?: number;
  top?: number;
}

const DEFAULT_MIN_BYTES = 100 * 1024 * 1024; // 100 MB
const BAR_WIDTH = 32;

/**
 * `disky analyze [path]` — read-only disk overview: whole-volume capacity plus
 * the largest files under a path, tagged with insights. Mirrors `mo analyze`.
 */
export class AnalyzeCommand implements ICommand {
  private readonly engine = new InsightEngine();

  constructor(private readonly options: AnalyzeCommandOptions = {}) {}

  async execute(): Promise<void> {
    const root = this.options.targetPath ? expandPath(this.options.targetPath) : os.homedir();
    const minBytes = this.options.minBytes ?? DEFAULT_MIN_BYTES;
    const json = this.options.json ?? !process.stdout.isTTY;
    const platform = macosPlatform();
    const reporter = new ProgressReporter(Boolean(process.stdout.isTTY) && !json);

    let files: DiskEntry[];
    try {
      files = await new ScanOrchestrator([
        new LargeFileScanProvider(platform.fileFinder, root, minBytes),
      ]).scan({ onProgress: reporter.update });
    } finally {
      reporter.done();
    }
    if (this.options.top !== undefined && this.options.top > 0) {
      files = files.slice(0, this.options.top);
    }
    files.forEach((e, i) => {
      e.id = i + 1;
    });

    const usage = diskUsage(root);

    if (json) {
      process.stdout.write(
        JSON.stringify(
          {
            root,
            disk: usage,
            files: files.map((e) => ({ ...e, insights: this.engine.analyze(e) })),
          },
          null,
          2,
        ) + '\n',
      );
      return;
    }

    console.log(`\n  ${Colors.brand('📊 disky analyze')}  ${Colors.dim(root)}\n`);
    if (usage) {
      console.log('  ' + renderBar(usage.usedFraction));
      console.log(
        `  ${Colors.size(formatBytes(usage.usedBytes))} used of ${formatBytes(usage.totalBytes)} ` +
          `(${Math.round(usage.usedFraction * 100)}%)  ·  ${Colors.success(formatBytes(usage.freeBytes))} free\n`,
      );
    }

    if (files.length === 0) {
      console.log(`  ${Colors.dim(`No files ≥ ${formatBytes(minBytes)} found.`)}\n`);
      return;
    }

    console.log(`  ${Colors.header(`Largest files ≥ ${formatBytes(minBytes)}`)}\n`);
    const sizeW = Math.max(...files.map((e) => e.sizeHuman.length));
    for (const file of files) {
      const tags = renderInsights(this.engine.analyze(file));
      console.log(
        `  ${Colors.size(file.sizeHuman.padStart(sizeW))}  ${file.displayPath}${tags ? '  ' + tags : ''}`,
      );
    }
    console.log('');
  }
}

function renderBar(fraction: number): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * BAR_WIDTH);
  return Colors.size('█'.repeat(filled)) + Colors.dim('░'.repeat(BAR_WIDTH - filled));
}

function renderInsights(insights: Insight[]): string {
  return insights
    .map((i) => {
      if (i.tone === 'good') return Colors.age(i.label);
      if (i.tone === 'warn') return Colors.size(i.label);
      return Colors.dim(i.label);
    })
    .join(' ');
}
