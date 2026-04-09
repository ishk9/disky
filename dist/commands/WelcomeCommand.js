"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WelcomeCommand = void 0;
const Colors_1 = require("../renderers/Colors");
const HeaderRenderer_1 = require("../renderers/HeaderRenderer");
const COMMANDS = [
    { cmd: 'disky scan', desc: 'Scan for disk hogs (node_modules, .next, dist, caches…)' },
    { cmd: 'disky scan --all', desc: 'Scan all large directories, no type filter' },
    { cmd: 'disky scan --min <sz>', desc: 'Only show entries above a size threshold (e.g. --min 500, --min 1GB)' },
    { cmd: 'disky scan --sort <mode>', desc: 'Sort by size (default), age, or type' },
    { cmd: 'disky scan --json', desc: 'Output scan results as JSON' },
    { cmd: 'disky <id>', desc: 'Detailed breakdown for a specific entry' },
    { cmd: 'disky <path>', desc: 'Detailed breakdown for a directory path' },
    { cmd: 'disky clean', desc: 'Interactively remove all detected hogs' },
    { cmd: 'disky clean <id>', desc: 'Remove a specific entry by ID' },
    { cmd: 'disky clean <path>', desc: 'Remove a specific directory by path' },
    { cmd: 'disky clean --dry-run', desc: 'Preview what would be deleted without removing anything' },
    { cmd: 'disky clean --exclude', desc: 'Skip specific paths during cleanup' },
    { cmd: 'disky watch', desc: 'Real-time monitor, refreshes every 5s' },
];
/**
 * Handles bare `disky` — shows the branded splash screen and command list.
 * No disk scanning is performed.
 */
class WelcomeCommand {
    constructor() {
        this.headerRenderer = new HeaderRenderer_1.HeaderRenderer();
    }
    async execute() {
        console.log('\n' + this.headerRenderer.render());
        console.log('');
        console.log(`  ${Colors_1.Colors.dim('Commands')}`);
        console.log('');
        const cmdWidth = Math.max(...COMMANDS.map((c) => c.cmd.length)) + 4;
        for (const { cmd, desc } of COMMANDS) {
            console.log(`  ${Colors_1.Colors.removeCommand(cmd.padEnd(cmdWidth))}${Colors_1.Colors.dim(desc)}`);
        }
        console.log('');
        console.log(`  ${Colors_1.Colors.dim('Run')} ${Colors_1.Colors.removeCommand('disky scan')} ${Colors_1.Colors.dim('to start.')}`);
        console.log('');
    }
}
exports.WelcomeCommand = WelcomeCommand;
//# sourceMappingURL=WelcomeCommand.js.map