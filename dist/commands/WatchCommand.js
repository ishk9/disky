"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchCommand = void 0;
const DiskScanner_1 = require("../core/DiskScanner");
const ScanCache_1 = require("../core/ScanCache");
const HeaderRenderer_1 = require("../renderers/HeaderRenderer");
const TableRenderer_1 = require("../renderers/TableRenderer");
const Colors_1 = require("../renderers/Colors");
const POLL_INTERVAL_MS = 5000;
/**
 * Handles `disky watch` — real-time terminal monitor with 5s polling.
 *
 * Highlights newly appeared entries in green for one cycle and
 * fades removed entries in red before they disappear.
 */
class WatchCommand {
    constructor(scanner) {
        this.previousIds = new Set();
        this.previousEntries = new Map();
        this.scanner = scanner ?? new DiskScanner_1.DiskScanner();
        this.cache = new ScanCache_1.ScanCache();
        this.headerRenderer = new HeaderRenderer_1.HeaderRenderer();
        this.tableRenderer = new TableRenderer_1.TableRenderer();
    }
    async execute() {
        process.on('SIGINT', () => {
            process.stdout.write('\x1b[?25h'); // restore cursor
            console.log(`\n  ${Colors_1.Colors.dim('Stopped watching.')}\n`);
            process.exit(0);
        });
        process.stdout.write('\x1b[?25l'); // hide cursor
        // eslint-disable-next-line no-constant-condition
        while (true) {
            await this.tick();
            await this.sleep(POLL_INTERVAL_MS);
        }
    }
    async tick() {
        const entries = await this.scanner.scan(true);
        this.cache.save(entries);
        const currentMap = new Map(entries.map((e) => [e.id, e]));
        const currentIds = new Set(entries.map((e) => e.id));
        const newIds = new Set();
        for (const id of currentIds) {
            if (!this.previousIds.has(id))
                newIds.add(id);
        }
        const removedEntries = [];
        for (const [id, entry] of this.previousEntries) {
            if (!currentIds.has(id))
                removedEntries.push(entry);
        }
        this.previousIds = currentIds;
        this.previousEntries = currentMap;
        this.redraw(entries, newIds, removedEntries);
    }
    redraw(entries, newIds, removedEntries) {
        console.clear();
        console.log('\n' + this.headerRenderer.render({ watchMode: true }));
        console.log('');
        if (entries.length === 0 && removedEntries.length === 0) {
            console.log(`  ${Colors_1.Colors.dim('No disk hogs found.')}`);
        }
        else {
            console.log(this.tableRenderer.render(entries, { newIds, removedEntries }));
        }
        console.log('');
        console.log(this.buildFooter(entries));
        console.log('');
    }
    buildFooter(entries) {
        const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        return '  ' + Colors_1.Colors.dim(`Last updated: ${time}  ·  ${(0, DiskScanner_1.formatBytes)(totalBytes)} recoverable`);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.WatchCommand = WatchCommand;
//# sourceMappingURL=WatchCommand.js.map