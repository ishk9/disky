"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanRenderer = void 0;
const Colors_1 = require("./Colors");
const DiskScanner_1 = require("../core/DiskScanner");
/**
 * Renders the bulk-clean scanning list and per-removal progress lines.
 */
class CleanRenderer {
    render(entries) {
        if (entries.length === 0) {
            return `\n  ${Colors_1.Colors.success('✓')} ${Colors_1.Colors.dim('No disk hogs found.')}\n`;
        }
        const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
        const idW = Math.max(4, ...entries.map((e) => String(e.id).length)) + 2;
        const sizeW = Math.max(6, ...entries.map((e) => e.sizeHuman.length)) + 2;
        const typeW = Math.max(6, ...entries.map((e) => e.artifactType.label.length)) + 2;
        const pathW = Math.max(6, ...entries.map((e) => e.displayPath.length)) + 2;
        const headerRow = [
            Colors_1.Colors.header('ID'.padEnd(idW)),
            Colors_1.Colors.header('SIZE'.padEnd(sizeW)),
            Colors_1.Colors.header('TYPE'.padEnd(typeW)),
            Colors_1.Colors.header('PATH'.padEnd(pathW)),
        ].join('');
        const rows = entries.map((e) => {
            return [
                Colors_1.Colors.id(String(e.id).padEnd(idW)),
                Colors_1.Colors.size(e.sizeHuman.padEnd(sizeW)),
                Colors_1.Colors.artifact(e.artifactType.color)(e.artifactType.label.padEnd(typeW)),
                Colors_1.Colors.path(e.displayPath.padEnd(pathW)),
            ].join('');
        });
        const lines = [
            '',
            `  ${Colors_1.Colors.dim('Scanning for disk hogs...')}`,
            '',
            `  ${Colors_1.Colors.error(`Found ${entries.length} removable director${entries.length !== 1 ? 'ies' : 'y'}:`)}`,
            '',
            `  ${headerRow}`,
            ...rows.map((r) => `  ${r}`),
            '',
            `  ${Colors_1.Colors.dim(`Total recoverable: ${(0, DiskScanner_1.formatBytes)(totalBytes)}`)}`,
            '',
        ];
        return lines.join('\n');
    }
    renderRemovalResults(results) {
        const lines = [''];
        const totalFreed = results.reduce((sum, r) => sum + r.bytesFreed, 0);
        for (const r of results) {
            const id = Colors_1.Colors.id(`[${r.id}]`);
            const label = Colors_1.Colors.artifact('green')(r.label.padEnd(16));
            const pth = Colors_1.Colors.dim(r.displayPath.padEnd(40));
            const freed = Colors_1.Colors.size(`(${(0, DiskScanner_1.formatBytes)(r.bytesFreed)} freed)`);
            lines.push(`  ${Colors_1.Colors.success('✓')} ${id} Removed ${label} ${pth} ${freed}`);
        }
        lines.push('');
        lines.push(`  ${Colors_1.Colors.dim(`${(0, DiskScanner_1.formatBytes)(totalFreed)} freed.`)}`);
        lines.push('');
        return lines.join('\n');
    }
}
exports.CleanRenderer = CleanRenderer;
//# sourceMappingURL=CleanRenderer.js.map