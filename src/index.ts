#!/usr/bin/env node

// Gracefully handle broken pipes (e.g. `disky scan --json | head -20`)
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

import { Command } from 'commander';
import { WelcomeCommand } from './commands/WelcomeCommand.js';
import { ListCommand, parseMinSize } from './commands/ListCommand.js';
import { DetailCommand } from './commands/DetailCommand.js';
import { CleanCommand } from './commands/CleanCommand.js';
import { WatchCommand } from './commands/WatchCommand.js';
import { SweepCommand } from './commands/SweepCommand.js';
import { InstallerCommand } from './commands/InstallerCommand.js';
import { AnalyzeCommand } from './commands/AnalyzeCommand.js';
import { Colors } from './renderers/Colors.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('disky')
  .description(
    'Surfaces disk hogs — node_modules, .next, dist, Docker images, build caches — with one-command cleanup',
  )
  .version(pkg.version);

// ─── disky (welcome splash, no scan) ──────────────────────────────────────
program.argument('[target]', 'Entry ID or directory path to inspect').action((target?: string) => {
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
      console.error(
        `\n  ${Colors.error(`Invalid size "${opts.min}". Use formats like 500MB, 1.5GB, 100KB.\n`)}`,
      );
      process.exit(1);
    }

    const validSortModes = ['size', 'age', 'type'];
    if (opts.sort && !validSortModes.includes(opts.sort)) {
      console.error(
        `\n  ${Colors.error(`Invalid sort mode "${opts.sort}". Use: size, age, or type.\n`)}`,
      );
      process.exit(1);
    }

    const sortMode = (opts.sort as 'size' | 'age' | 'type') ?? 'size';
    new ListCommand({ artifactOnly: !opts.all, minBytes, sortMode, json: opts.json, top: opts.top })
      .execute()
      .catch(handleError);
  });

// ─── disky watch ──────────────────────────────────────────────────────────
program
  .command('watch')
  .description('Real-time monitor — refreshes every 5s (Ctrl+C to exit)')
  .action(() => {
    new WatchCommand().execute().catch(handleError);
  });

// ─── disky tui ───────────────────────────────────────────────────────
program
  .command('tui')
  .description('Launch the interactive terminal UI')
  .action(() => {
    import('./tui/App.js')
      .then(({ launchTUI }) => launchTUI().catch(handleError))
      .catch(handleError);
  });

// ─── disky clean [id|path] ────────────────────────────────────────────────
program
  .command('clean [target]')
  .description(
    'Remove disk hogs. Pass an ID or path to target a specific entry; omit for interactive bulk cleanup',
  )
  .option('--dry-run', 'Preview what would be deleted without removing anything')
  .option('--exclude <paths...>', 'Paths to skip during cleanup (repeatable)')
  .option('--force', 'Allow targeted removal of locked entries')
  .action(
    (target?: string, cmdOpts?: { dryRun?: boolean; exclude?: string[]; force?: boolean }) => {
      const opts = resolveTarget(target);
      new CleanCommand({
        ...opts,
        dryRun: cmdOpts?.dryRun,
        excludePaths: cmdOpts?.exclude,
        force: cmdOpts?.force,
      })
        .execute()
        .catch(handleError);
    },
  );

// ─── disky sweep ──────────────────────────────────────────────────────────
program
  .command('sweep')
  .description('Reclaim space from system/app caches, logs, and trash')
  .option('--dry-run', 'Preview what would be freed without removing anything')
  .option('--json', 'Output results as JSON (auto-enabled when piped)')
  .option('--exclude <paths...>', 'Paths to skip (repeatable)')
  .action((opts: { dryRun?: boolean; json?: boolean; exclude?: string[] }) => {
    new SweepCommand({ dryRun: opts.dryRun, json: opts.json, excludePaths: opts.exclude })
      .execute()
      .catch(handleError);
  });

// ─── disky installer ──────────────────────────────────────────────────────
program
  .command('installer')
  .description('Find and remove installer files (.dmg/.pkg/.iso) in Downloads/Desktop')
  .option('--dry-run', 'Preview what would be removed without deleting anything')
  .option('--json', 'Output results as JSON (auto-enabled when piped)')
  .option('--exclude <paths...>', 'Paths to skip (repeatable)')
  .action((opts: { dryRun?: boolean; json?: boolean; exclude?: string[] }) => {
    new InstallerCommand({ dryRun: opts.dryRun, json: opts.json, excludePaths: opts.exclude })
      .execute()
      .catch(handleError);
  });

// ─── disky analyze [path] ─────────────────────────────────────────────────
program
  .command('analyze [path]')
  .description('Disk usage overview and largest-file finder (read-only)')
  .option('--min <size>', 'Minimum file size to list (e.g. 100MB, 1GB)')
  .option('--top <n>', 'Limit to the top N files', parseInt)
  .option('--json', 'Output results as JSON (auto-enabled when piped)')
  .action(
    (targetPath: string | undefined, opts: { min?: string; top?: number; json?: boolean }) => {
      const minBytes = opts.min ? parseMinSize(opts.min) : undefined;
      if (opts.min && (isNaN(minBytes!) || minBytes! <= 0)) {
        console.error(
          `\n  ${Colors.error(`Invalid size "${opts.min}". Use formats like 100MB, 1.5GB.\n`)}`,
        );
        process.exit(1);
      }
      new AnalyzeCommand({ targetPath, minBytes, top: opts.top, json: opts.json })
        .execute()
        .catch(handleError);
    },
  );

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
