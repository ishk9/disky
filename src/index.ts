#!/usr/bin/env node

// Gracefully handle broken pipes (e.g. `disky scan --json | head -20`)
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

import { Command } from 'commander';
import { WelcomeCommand } from './commands/WelcomeCommand';
import { ListCommand, parseMinSize } from './commands/ListCommand';
import { DetailCommand } from './commands/DetailCommand';
import { CleanCommand } from './commands/CleanCommand';
import { WatchCommand } from './commands/WatchCommand';
import { Colors } from './renderers/Colors';
import pkg from '../package.json';

const program = new Command();

program
  .name('disky')
  .description('Surfaces disk hogs — node_modules, .next, dist, Docker images, build caches — with one-command cleanup')
  .version(pkg.version);

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
  .option('--sort <mode>', 'Sort results: size (default), age, or type')
  .option('--json', 'Output results as JSON (pipe-friendly, no colors)')
  .option('--top <n>', 'Limit output to the top N entries', parseInt)
  .action((opts: { all?: boolean; min?: string; sort?: string; json?: boolean; top?: number }) => {
    const minBytes = opts.min ? parseMinSize(opts.min) : undefined;

    if (opts.min && (isNaN(minBytes!) || minBytes! <= 0)) {
      console.error(`\n  ${Colors.error(`Invalid size "${opts.min}". Use formats like 500MB, 1.5GB, 100KB.\n`)}`);
      process.exit(1);
    }

    const validSortModes = ['size', 'age', 'type'];
    if (opts.sort && !validSortModes.includes(opts.sort)) {
      console.error(`\n  ${Colors.error(`Invalid sort mode "${opts.sort}". Use: size, age, or type.\n`)}`);
      process.exit(1);
    }

    const sortMode = (opts.sort as 'size' | 'age' | 'type') ?? 'size';
    new ListCommand({ artifactOnly: !opts.all, minBytes, sortMode, json: opts.json, top: opts.top }).execute().catch(handleError);
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
  .option('--dry-run', 'Preview what would be deleted without removing anything')
  .option('--exclude <paths...>', 'Paths to skip during cleanup (repeatable)')
  .action((target?: string, cmdOpts?: { dryRun?: boolean; exclude?: string[] }) => {
    const opts = resolveTarget(target);
    new CleanCommand({ ...opts, dryRun: cmdOpts?.dryRun, excludePaths: cmdOpts?.exclude }).execute().catch(handleError);
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
