#!/usr/bin/env node

import { Command } from 'commander';
import { ListCommand } from './commands/ListCommand';
import { DetailCommand } from './commands/DetailCommand';
import { CleanCommand } from './commands/CleanCommand';
import { WatchCommand } from './commands/WatchCommand';

const program = new Command();

program
  .name('disky')
  .description('Surfaces disk hogs — node_modules, .next, dist, Docker images, build caches — with one-command cleanup')
  .version('1.0.0')
  .option('--all', 'Show all large directories, not just known artifact types');

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
    const options = resolveTarget(target);
    new CleanCommand(options).execute().catch(handleError);
  });

// ─── disky [id|path] (default: list, or detail when target given) ──────────
program
  .argument('[target]', 'Entry ID or directory path to inspect')
  .action((target?: string) => {
    const opts = program.opts() as { all?: boolean };

    if (!target) {
      new ListCommand({ artifactOnly: !opts.all }).execute().catch(handleError);
      return;
    }

    const options = resolveTarget(target);
    new DetailCommand(options).execute().catch(handleError);
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
