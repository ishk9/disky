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
import { StatusCommand } from './commands/StatusCommand.js';
import { UninstallCommand } from './commands/UninstallCommand.js';
import { OptimizeCommand } from './commands/OptimizeCommand.js';
import { HistoryCommand } from './commands/HistoryCommand.js';
import { WhitelistCommand } from './commands/WhitelistCommand.js';
import { TouchIdAction, TouchIdCommand } from './commands/TouchIdCommand.js';
import { CompletionCommand, CompletionShell } from './commands/CompletionCommand.js';
import { UpdateCommand } from './commands/UpdateCommand.js';
import type { WhitelistCategory } from './core/Config.js';
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
  .option('--whitelist <patterns...>', 'Additional protected patterns for this run')
  .option('--force', 'Allow targeted removal of locked entries')
  .action(
    (
      target?: string,
      cmdOpts?: { dryRun?: boolean; exclude?: string[]; whitelist?: string[]; force?: boolean },
    ) => {
      const opts = resolveTarget(target);
      new CleanCommand({
        ...opts,
        dryRun: cmdOpts?.dryRun,
        excludePaths: cmdOpts?.exclude,
        whitelistPatterns: cmdOpts?.whitelist,
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
  .option('--whitelist <patterns...>', 'Additional protected patterns for this run')
  .action(
    (opts: { dryRun?: boolean; json?: boolean; exclude?: string[]; whitelist?: string[] }) => {
      new SweepCommand({
        dryRun: opts.dryRun,
        json: opts.json,
        excludePaths: opts.exclude,
        whitelistPatterns: opts.whitelist,
      })
        .execute()
        .catch(handleError);
    },
  );

// ─── disky installer ──────────────────────────────────────────────────────
program
  .command('installer')
  .description('Find and remove installer files (.dmg/.pkg/.iso) in Downloads/Desktop')
  .option('--dry-run', 'Preview what would be removed without deleting anything')
  .option('--json', 'Output results as JSON (auto-enabled when piped)')
  .option('--exclude <paths...>', 'Paths to skip (repeatable)')
  .option('--whitelist <patterns...>', 'Additional protected patterns for this run')
  .action(
    (opts: { dryRun?: boolean; json?: boolean; exclude?: string[]; whitelist?: string[] }) => {
      new InstallerCommand({
        dryRun: opts.dryRun,
        json: opts.json,
        excludePaths: opts.exclude,
        whitelistPatterns: opts.whitelist,
      })
        .execute()
        .catch(handleError);
    },
  );

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

// ─── disky status ─────────────────────────────────────────────────────────
program
  .command('status')
  .description('System dashboard — CPU, memory, disk, battery, network, health score')
  .option('--json', 'Output metrics as JSON (auto-enabled when piped)')
  .action((opts: { json?: boolean }) => {
    new StatusCommand({ json: opts.json }).execute().catch(handleError);
  });

// ─── disky uninstall <app> ───────────────────────────────────────────────
program
  .command('uninstall <app>')
  .description('Preview or remove a macOS app bundle plus associated remnants')
  .option('--execute', 'Actually remove files after confirmation (default is dry-run)')
  .option('--dry-run', 'Preview what would be removed (default)')
  .option('--json', 'Output preview/results as JSON (auto-enabled when piped)')
  .option('--force', 'Allow force-cleanable remnant entries')
  .action(
    (
      app: string,
      opts: { execute?: boolean; dryRun?: boolean; json?: boolean; force?: boolean },
    ) => {
      new UninstallCommand({
        query: app,
        dryRun: opts.execute ? false : (opts.dryRun ?? true),
        execute: opts.execute,
        json: opts.json,
        force: opts.force,
      })
        .execute()
        .catch(handleError);
    },
  );

// ─── disky optimize ──────────────────────────────────────────────────────
program
  .command('optimize')
  .description('Preview or run macOS maintenance steps (DNS, Launch Services, caches)')
  .option('--execute', 'Run selected steps after confirmation (default is dry-run)')
  .option('--dry-run', 'Preview selected steps (default)')
  .option('--json', 'Output results as JSON (auto-enabled when piped)')
  .option('--skip <keys...>', 'Step keys to skip')
  .action((opts: { execute?: boolean; dryRun?: boolean; json?: boolean; skip?: string[] }) => {
    new OptimizeCommand({
      dryRun: opts.execute ? false : (opts.dryRun ?? true),
      json: opts.json,
      skip: opts.skip,
    })
      .execute()
      .catch(handleError);
  });

// ─── disky history ───────────────────────────────────────────────────────
program
  .command('history')
  .description('Show the operation audit log')
  .option('--json', 'Output history as JSON (auto-enabled when piped)')
  .option('--limit <n>', 'Limit number of records', parseInt)
  .action((opts: { json?: boolean; limit?: number }) => {
    new HistoryCommand({ json: opts.json, limit: opts.limit }).execute().catch(handleError);
  });

// ─── disky whitelist ────────────────────────────────────────────────────
program
  .command('whitelist [action] [category] [pattern]')
  .description('List/add/remove protected cleanup patterns')
  .option('--json', 'Output whitelist config as JSON (auto-enabled when piped)')
  .action(
    (
      action = 'list',
      category: string | undefined,
      pattern: string | undefined,
      opts: { json?: boolean },
    ) => {
      if (!['list', 'add', 'remove'].includes(action)) {
        console.error(`\n  ${Colors.error('Invalid whitelist action. Use: list, add, remove.\n')}`);
        process.exit(1);
      }
      new WhitelistCommand({
        action: action as 'list' | 'add' | 'remove',
        category: category as WhitelistCategory | undefined,
        pattern,
        json: opts.json,
      })
        .execute()
        .catch(handleError);
    },
  );

// ─── disky touchid enable|disable ───────────────────────────────────────
program
  .command('touchid <action>')
  .description('Enable or disable Touch ID for sudo via /etc/pam.d/sudo_local')
  .option('--dry-run', 'Preview the sudo_local change without writing')
  .option('--json', 'Output result as JSON')
  .action((action: string, opts: { dryRun?: boolean; json?: boolean }) => {
    if (!['enable', 'disable'].includes(action)) {
      console.error(`\n  ${Colors.error('Invalid touchid action. Use: enable or disable.\n')}`);
      process.exit(1);
    }
    new TouchIdCommand({
      action: action as TouchIdAction,
      dryRun: opts.dryRun,
      json: opts.json,
    })
      .execute()
      .catch(handleError);
  });

// ─── disky completion ───────────────────────────────────────────────────
program
  .command('completion <shell>')
  .description('Print shell completion script for zsh, bash, or fish')
  .action((shell: string) => {
    if (!['zsh', 'bash', 'fish'].includes(shell)) {
      console.error(`\n  ${Colors.error('Invalid shell. Use: zsh, bash, or fish.\n')}`);
      process.exit(1);
    }
    new CompletionCommand({ shell: shell as CompletionShell }).execute().catch(handleError);
  });

// ─── disky update ───────────────────────────────────────────────────────
program
  .command('update')
  .description('Update disky through npm')
  .option('--nightly', 'Install @ishk9/disky@next instead of @latest')
  .option('--dry-run', 'Print the npm command without running it')
  .option('--json', 'Output result as JSON')
  .action((opts: { nightly?: boolean; dryRun?: boolean; json?: boolean }) => {
    new UpdateCommand({ nightly: opts.nightly, dryRun: opts.dryRun, json: opts.json })
      .execute()
      .catch(handleError);
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
