#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const WelcomeCommand_1 = require("./commands/WelcomeCommand");
const ListCommand_1 = require("./commands/ListCommand");
const DetailCommand_1 = require("./commands/DetailCommand");
const CleanCommand_1 = require("./commands/CleanCommand");
const WatchCommand_1 = require("./commands/WatchCommand");
const Colors_1 = require("./renderers/Colors");
const program = new commander_1.Command();
program
    .name('disky')
    .description('Surfaces disk hogs — node_modules, .next, dist, Docker images, build caches — with one-command cleanup')
    .version('1.0.0');
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
    .action((opts) => {
    const minBytes = opts.min ? (0, ListCommand_1.parseMinSize)(opts.min) : undefined;
    if (opts.min && (isNaN(minBytes) || minBytes <= 0)) {
        console.error(`\n  ${Colors_1.Colors.error(`Invalid size "${opts.min}". Use formats like 500MB, 1.5GB, 100KB.\n`)}`);
        process.exit(1);
    }
    new ListCommand_1.ListCommand({ artifactOnly: !opts.all, minBytes }).execute().catch(handleError);
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
    .action((target) => {
    const opts = resolveTarget(target);
    new CleanCommand_1.CleanCommand(opts).execute().catch(handleError);
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