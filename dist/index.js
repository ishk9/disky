#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Gracefully handle broken pipes (e.g. `disky scan --json | head -20`)
process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE')
        process.exit(0);
    throw err;
});
const commander_1 = require("commander");
const WelcomeCommand_1 = require("./commands/WelcomeCommand");
const ListCommand_1 = require("./commands/ListCommand");
const DetailCommand_1 = require("./commands/DetailCommand");
const CleanCommand_1 = require("./commands/CleanCommand");
const WatchCommand_1 = require("./commands/WatchCommand");
const Colors_1 = require("./renderers/Colors");
const package_json_1 = __importDefault(require("../package.json"));
const program = new commander_1.Command();
program
    .name('disky')
    .description('Surfaces disk hogs — node_modules, .next, dist, Docker images, build caches — with one-command cleanup')
    .version(package_json_1.default.version);
// ─── disky (welcome splash, no scan) ──────────────────────────────────────
program
    .argument('[target]', 'Entry ID or directory path to inspect')
    .action((target) => {
    if (!target) {
        new WelcomeCommand_1.WelcomeCommand().execute().catch(handleError);
        return;
    }
    const opts = resolveTarget(target);
    new DetailCommand_1.DetailCommand(opts).execute().catch(handleError);
});
// ─── disky scan ───────────────────────────────────────────────────────────
program
    .command('scan')
    .description('Scan for disk hogs and show a ranked table')
    .option('--all', 'Include all large directories, not just known artifact types')
    .option('--min <size>', 'Only show entries at or above this size (e.g. 500MB, 1GB, 100KB)')
    .option('--sort <mode>', 'Sort results: size (default), age, or type')
    .option('--json', 'Output results as JSON (pipe-friendly, no colors)')
    .action((opts) => {
    const minBytes = opts.min ? (0, ListCommand_1.parseMinSize)(opts.min) : undefined;
    if (opts.min && (isNaN(minBytes) || minBytes <= 0)) {
        console.error(`\n  ${Colors_1.Colors.error(`Invalid size "${opts.min}". Use formats like 500MB, 1.5GB, 100KB.\n`)}`);
        process.exit(1);
    }
    const validSortModes = ['size', 'age', 'type'];
    if (opts.sort && !validSortModes.includes(opts.sort)) {
        console.error(`\n  ${Colors_1.Colors.error(`Invalid sort mode "${opts.sort}". Use: size, age, or type.\n`)}`);
        process.exit(1);
    }
    const sortMode = opts.sort ?? 'size';
    new ListCommand_1.ListCommand({ artifactOnly: !opts.all, minBytes, sortMode, json: opts.json }).execute().catch(handleError);
});
// ─── disky watch ──────────────────────────────────────────────────────────
program
    .command('watch')
    .description('Real-time monitor — refreshes every 5s (Ctrl+C to exit)')
    .action(() => {
    new WatchCommand_1.WatchCommand().execute().catch(handleError);
});
// ─── disky clean [id|path] ────────────────────────────────────────────────
program
    .command('clean [target]')
    .description('Remove disk hogs. Pass an ID or path to target a specific entry; omit for interactive bulk cleanup')
    .option('--dry-run', 'Preview what would be deleted without removing anything')
    .option('--exclude <paths...>', 'Paths to skip during cleanup (repeatable)')
    .action((target, cmdOpts) => {
    const opts = resolveTarget(target);
    new CleanCommand_1.CleanCommand({ ...opts, dryRun: cmdOpts?.dryRun, excludePaths: cmdOpts?.exclude }).execute().catch(handleError);
});
program.parse(process.argv);
// ─── Helpers ──────────────────────────────────────────────────────────────
function resolveTarget(target) {
    if (!target)
        return {};
    const asNumber = Number(target);
    if (!isNaN(asNumber) && Number.isInteger(asNumber) && asNumber > 0) {
        return { id: asNumber };
    }
    return { targetPath: target };
}
function handleError(err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  Error: ${message}\n`);
    process.exit(1);
}
//# sourceMappingURL=index.js.map