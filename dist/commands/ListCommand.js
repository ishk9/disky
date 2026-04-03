"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCommand = void 0;
const DiskScanner_1 = require("../core/DiskScanner");
const ScanCache_1 = require("../core/ScanCache");
const HeaderRenderer_1 = require("../renderers/HeaderRenderer");
const TableRenderer_1 = require("../renderers/TableRenderer");
const Colors_1 = require("../renderers/Colors");
/**
 * Handles `disky` and `disky --all`.
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
        const entries = await this.scanner.scan(this.options.artifactOnly);
        this.cache.save(entries);
        console.log('\n' + this.headerRenderer.render());
        console.log('');
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
        const totalHuman = (0, DiskScanner_1.formatBytes)(totalBytes);
        const parts = [`${totalHuman} recoverable`, 'Run disky <id> for details'];
        if (this.options.artifactOnly) {
            parts.push('disky clean to free space');
        }
        return '  ' + Colors_1.Colors.dim(parts.join('  ·  '));
    }
}
exports.ListCommand = ListCommand;
//# sourceMappingURL=ListCommand.js.map