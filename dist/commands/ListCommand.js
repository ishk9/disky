"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCommand = void 0;
exports.parseMinSize = parseMinSize;
const DiskScanner_1 = require("../core/DiskScanner");
const ScanCache_1 = require("../core/ScanCache");
const HeaderRenderer_1 = require("../renderers/HeaderRenderer");
const TableRenderer_1 = require("../renderers/TableRenderer");
const Colors_1 = require("../renderers/Colors");
/**
 * Handles `disky scan`, `disky scan --all`, and `disky scan --min <size>`.
 */
class ListCommand {
    constructor(options, scanner) {
        this.options = options;
        this.scanner = scanner ?? new DiskScanner_1.DiskScanner();
        this.cache = new ScanCache_1.ScanCache();
        this.headerRenderer = new HeaderRenderer_1.HeaderRenderer();
        this.tableRenderer = new TableRenderer_1.TableRenderer();
    }
    async execute() {
        let entries = await this.scanner.scan(this.options.artifactOnly);
        if (this.options.minBytes !== undefined && this.options.minBytes > 0) {
            entries = entries.filter((e) => e.sizeBytes >= this.options.minBytes);
        }
        this.cache.save(entries);
        console.log('\n' + this.headerRenderer.render());
        console.log('');
        if (this.options.minBytes) {
            console.log(`  ${Colors_1.Colors.dim(`Showing entries ≥ ${(0, DiskScanner_1.formatBytes)(this.options.minBytes)}`)}`);
            console.log('');
        }
        if (entries.length === 0) {
            console.log(`  ${Colors_1.Colors.dim('No disk hogs found.')}`);
        }
        else {
            console.log(this.tableRenderer.render(entries));
        }
        console.log('');
        console.log(this.buildFooter(entries));
        console.log('');
    }
    buildFooter(entries) {
        const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
        const parts = [`${(0, DiskScanner_1.formatBytes)(totalBytes)} recoverable`, 'Run disky <id> for details'];
        if (this.options.artifactOnly) {
            parts.push('disky clean to free space');
        }
        return '  ' + Colors_1.Colors.dim(parts.join('  ·  '));
    }
}
exports.ListCommand = ListCommand;
/**
 * Parses a human-readable size string into bytes.
 * Accepts: "500MB", "1.5GB", "100KB", "2048" (raw bytes).
 * Returns NaN if the string is not parseable.
 */
function parseMinSize(input) {
    const match = input.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match)
        return NaN;
    const value = parseFloat(match[1] ?? '0');
    const unit = (match[2] ?? 'B').toUpperCase();
    const multipliers = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4,
    };
    return Math.round(value * (multipliers[unit] ?? 1));
}
//# sourceMappingURL=ListCommand.js.map