#!/usr/bin/env node

import { Command } from 'commander';
import { WelcomeCommand } from './commands/WelcomeCommand';
import { ListCommand, parseMinSize } from './commands/ListCommand';
import { DetailCommand } from './commands/DetailCommand';
import { CleanCommand } from './commands/CleanCommand';
import { WatchCommand } from './commands/WatchCommand';
import { Colors } from './renderers/Colors';

const program = new Command();

program
  .name('disky')
  .description('Surfaces disk hogs — node_modules, .next, dist, Docker images, build caches — with one-command cleanup')
  .version('1.0.0');

// ─── disky (welcome splash, no scan) ──────────────────────────────────────
program
  .argument('[target]', 'Entry ID or directory path to inspect')
  .action((target?: string) => {
    if (!target) {
      new WelcomeCommand().execute().catch(handleError);
      return;
    }
    const opts = resolveTarget(target);
    new DetailCommand(opts).execute().catch(handleError);
  });

// ─── disky scan ───────────────────────────────────────────────────────────
program
  .command('scan')
  .description('Scan for disk hogs and show a ranked table')
  .option('--all', 'Include all large directories, not just known artifact types')
  .option('--min <size>', 'Only show entries at or above this size (e.g. 500MB, 1GB, 100KB)')
  .action((opts: { all?: boolean; min?: string }) => {
    const minBytes = opts.min ? parseMinSize(opts.min) : undefined;

    if (opts.min && (isNaN(minBytes!) || minBytes! <= 0)) {
      console.error(`\n  ${Colors.error(`Invalid size "${opts.min}". Use formats like 500MB, 1.5GB, 100KB.\n`)}`);
      process.exit(1);
    }

    new ListCommand({ artifactOnly: !opts.all, minBytes }).execute().catch(handleError);
  });

// ─── disky watch ──────────────────────────────────────────────────────────
program
  .command('watch')
  .description('Real-time monitor — refreshes every 5s (Ctrl+C to exit)')
  .action(() => {
    new WatchCommand().execute().catch(handleError);
  });

// ─── disky clean [id|path] ────────────────────────────────────────────────
program
  .command('clean [target]')
  .description('Remove disk hogs. Pass an ID or path to target a specific entry; omit for interactive bulk cleanup')
  .action((target?: string) => {
    const opts = resolveTarget(target);
    new CleanCommand(opts).execute().catch(handleError);
  });

program.parse(process.argv);

// ─── Helpers ──────────────────────────────────────────────────────────────

function resolveTarget(target?: string): { id?: number; targetPath?: string } {
  if (!target) return {};

  const asNumber = Number(target);
  if (!isNaN(asNumber) && Number.isInteger(asNumber) && asNumber > 0) {
    return { id: asNumber };
  }

  return { targetPath: target };
}

function handleError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  Error: ${message}\n`);
  process.exit(1);
}
