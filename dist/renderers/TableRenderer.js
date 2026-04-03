"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableRenderer = void 0;
const Colors_1 = require("./Colors");
const COLS = {
    id: { header: 'ID', min: 6 },
    size: { header: 'SIZE', min: 10 },
    type: { header: 'TYPE', min: 15 },
    path: { header: 'PATH', min: 30 },
    project: { header: 'PROJECT', min: 15 },
    age: { header: 'AGE', min: 10 },
};
/**
 * Renders the main disk-hog table with dynamic column widths.
 */
class TableRenderer {
    render(entries, options = {}) {
        const allEntries = [
            ...(options.removedEntries ?? []),
            ...entries,
        ];
        const widths = this.calculateWidths(allEntries);
        const lines = [];
        lines.push(this.renderHeader(widths));
        for (const entry of options.removedEntries ?? []) {
            lines.push(this.renderRow(entry, widths, 'removed'));
        }
        for (const entry of entries) {
            const highlight = options.newIds?.has(entry.id) ? 'new' : 'normal';
            lines.push(this.renderRow(entry, widths, highlight));
        }
        return lines.join('\n');
    }
    calculateWidths(entries) {
        const widths = {
            id: COLS.id.min,
            size: COLS.size.min,
            type: COLS.type.min,
            path: COLS.path.min,
            project: COLS.project.min,
            age: COLS.age.min,
        };
        for (const e of entries) {
            widths.id = Math.max(widths.id, String(e.id).length + 2);
            widths.size = Math.max(widths.size, e.sizeHuman.length + 2);
            widths.type = Math.max(widths.type, e.artifactType.label.length + 2);
            widths.path = Math.max(widths.path, e.displayPath.length + 2);
            widths.project = Math.max(widths.project, (e.project ?? '–').length + 2);
            widths.age = Math.max(widths.age, e.ageHuman.length + 2);
        }
        return widths;
    }
    renderHeader(widths) {
        const cols = ['id', 'size', 'type', 'path', 'project', 'age'];
        const parts = cols.map((k) => Colors_1.Colors.header(COLS[k].header.padEnd(widths[k])));
        return '  ' + parts.join('');
    }
    renderRow(entry, widths, highlight) {
        const idStr = String(entry.id);
        const sizeStr = entry.sizeHuman;
        const typeStr = entry.artifactType.label;
        const pathStr = entry.displayPath;
        const projectStr = entry.project ?? '–';
        const ageStr = entry.ageHuman;
        const cells = [
            Colors_1.Colors.id(idStr.padEnd(widths.id)),
            Colors_1.Colors.size(sizeStr.padEnd(widths.size)),
            Colors_1.Colors.artifact(entry.artifactType.color)(typeStr.padEnd(widths.type)),
            Colors_1.Colors.path(pathStr.padEnd(widths.path)),
            entry.project
                ? Colors_1.Colors.project(projectStr.padEnd(widths.project))
                : Colors_1.Colors.dim(projectStr.padEnd(widths.project)),
            entry.ageMs > 0
                ? Colors_1.Colors.age(ageStr.padEnd(widths.age))
                : Colors_1.Colors.dim(ageStr.padEnd(widths.age)),
        ];
        const row = '  ' + cells.join('');
        if (highlight === 'new')
            return Colors_1.Colors.newEntry(row);
        if (highlight === 'removed')
            return Colors_1.Colors.removedEntry(row);
        return row;
    }
}
exports.TableRenderer = TableRenderer;
//# sourceMappingURL=TableRenderer.js.map