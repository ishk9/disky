#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const ListCommand_1 = require("./commands/ListCommand");
const DetailCommand_1 = require("./commands/DetailCommand");
const CleanCommand_1 = require("./commands/CleanCommand");
const WatchCommand_1 = require("./commands/WatchCommand");
const program = new commander_1.Command();
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
    new WatchCommand_1.WatchCommand().execute().catch(handleError);
});
// ─── disky clean [id|path] ────────────────────────────────────────────────
program
    .command('clean [target]')
    .description('Remove disk hogs. Pass an ID or path to target a specific entry; omit for interactive bulk cleanup')
    .action((target) => {
    const options = resolveTarget(target);
    new CleanCommand_1.CleanCommand(options).execute().catch(handleError);
});
// ─── disky [id|path] (default: list, or detail when target given) ──────────
program
    .argument('[target]', 'Entry ID or directory path to inspect')
    .action((target) => {
    const opts = program.opts();
    if (!target) {
        new ListCommand_1.ListCommand({ artifactOnly: !opts.all }).execute().catch(handleError);
        return;
    }
    const options = resolveTarget(target);
    new DetailCommand_1.DetailCommand(options).execute().catch(handleError);
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