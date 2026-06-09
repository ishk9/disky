import { DiskEntry } from '../types/index.js';
import { IScanProvider } from '../scan/IScanProvider.js';
import { ScanOrchestrator } from '../scan/ScanOrchestrator.js';
import { ProgressReporter } from '../io/ProgressReporter.js';
import { Config } from '../core/Config.js';
import { getEffectiveExclusions, isExcluded, promptConfirm } from '../core/EntryResolver.js';
import { isAutoCleanable, getCleanPolicy } from '../core/CleanPolicy.js';
import { CleanService } from '../clean/CleanService.js';
import { TableRenderer } from '../renderers/TableRenderer.js';
import { Colors } from '../renderers/Colors.js';
import { formatBytes } from '../core/format.js';

export interface ScanCleanOptions {
  dryRun?: boolean;
  json?: boolean;
  excludePaths?: string[];
  force?: boolean;
}

export interface ScanCleanConfig {
  /** Header line, e.g. "🧹 disky sweep". */
  title: string;
  /** Header subtitle, e.g. "caches · logs · trash". */
  subtitle: string;
  /** Operation label recorded in the audit log, e.g. "sweep". */
  op: string;
  /** Verb used in prompts/output, e.g. "Sweep" / "Remove". */
  verb: string;
  /** Shown when no entries are found. */
  emptyMessage: string;
}

/**
 * Shared scan → preview → confirm → clean → report flow used by `sweep` and
 * `installer`. Honors --json (auto when piped), --dry-run, exclusions, and the
 * audit log; never removes locked entries.
 */
export async function runScanCleanFlow(
  providers: IScanProvider[],
  options: ScanCleanOptions,
  config: ScanCleanConfig,
  cleanService: CleanService = new CleanService(),
): Promise<void> {
  const json = options.json ?? !process.stdout.isTTY;
  const reporter = new ProgressReporter(Boolean(process.stdout.isTTY) && !json);

  let entries: DiskEntry[];
  try {
    entries = await new ScanOrchestrator(providers).scan({ onProgress: reporter.update });
  } finally {
    reporter.done();
  }
  entries.forEach((e, i) => {
    e.id = i + 1;
  });

  if (json) {
    process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
    return;
  }

  console.log(`\n  ${Colors.brand(config.title)}  ${Colors.dim(config.subtitle)}\n`);

  if (entries.length === 0) {
    console.log(`  ${Colors.dim(config.emptyMessage)}\n`);
    return;
  }

  console.log(new TableRenderer().render(entries));
  console.log('');

  const exclusions = getEffectiveExclusions(new Config(), options.excludePaths);
  const cleanable = entries.filter(isAutoCleanable).filter((e) => !isExcluded(e, exclusions));
  const lockedCount = entries.filter((e) => getCleanPolicy(e.artifactType) === 'locked').length;
  const totalBytes = cleanable.reduce((sum, e) => sum + e.sizeBytes, 0);

  if (lockedCount > 0) {
    console.log(
      `  ${Colors.dim(`Skipping ${lockedCount} locked ${plural(lockedCount, 'entry', 'entries')}`)}\n`,
    );
  }
  if (cleanable.length === 0) {
    console.log(`  ${Colors.dim('No auto-cleanable entries.')}\n`);
    return;
  }

  if (options.dryRun) {
    console.log(
      `  ${Colors.prompt('[DRY RUN]')} Would free ${formatBytes(totalBytes)} across ${cleanable.length} ${plural(cleanable.length, 'entry', 'entries')}`,
    );
    console.log(`  ${Colors.dim('No files were modified.')}\n`);
    return;
  }

  const confirmed = await promptConfirm(
    `  ${Colors.prompt(`${config.verb} ${cleanable.length} ${plural(cleanable.length, 'entry', 'entries')} (${formatBytes(totalBytes)})? [y/N]`)} `,
  );
  if (!confirmed) {
    console.log(`\n  ${Colors.dim('Aborted.')}\n`);
    return;
  }

  let freed = 0;
  let failed = 0;
  for (const entry of cleanable) {
    const result = cleanService.clean(entry, { force: options.force }, config.op);
    if (result.success) freed += result.bytesFreed;
    else failed++;
  }

  console.log(`\n  ${Colors.success(`✓ Freed ${formatBytes(freed)}`)}`);
  if (failed > 0) {
    console.log(`  ${Colors.error(`✗ ${failed} ${plural(failed, 'entry', 'entries')} failed`)}`);
  }
  console.log('');
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
