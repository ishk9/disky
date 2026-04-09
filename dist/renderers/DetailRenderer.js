"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetailRenderer = void 0;
const types_1 = require("../types");
const Colors_1 = require("./Colors");
/**
 * Renders the full detail view for a single disk entry (`disky <id>` / `disky <path>`).
 */
class DetailRenderer {
    render(entry) {
        const lines = [''];
        lines.push(...this.renderFields(entry));
        lines.push('');
        lines.push(...this.renderSection('Location'));
        lines.push(...this.renderLocation(entry));
        if (entry.topOffenders.length > 0) {
            lines.push('');
            lines.push(...this.renderSection('Top Offenders'));
            lines.push(...this.renderTopOffenders(entry));
        }
        lines.push('');
        lines.push(this.renderRemoveHint(entry));
        lines.push('');
        return lines.join('\n');
    }
    renderFields(entry) {
        const label = (s) => Colors_1.Colors.sectionLabel(s.padEnd(14));
        const ageDisplay = this.renderAgeField(entry);
        const lines = [
            `  ${label('ID')}${Colors_1.Colors.id(String(entry.id))}`,
            `  ${label('Type')}${Colors_1.Colors.artifact(entry.artifactType.color)(entry.artifactType.label)}`,
            `  ${label('Size')}${Colors_1.Colors.size(entry.sizeHuman)}`,
            `  ${label('Path')}${Colors_1.Colors.path(entry.displayPath)}`,
            `  ${label('Project')}${entry.project ? Colors_1.Colors.project(entry.project) : Colors_1.Colors.dim('–')}`,
            `  ${label('Last Modified')}${ageDisplay}`,
        ];
        if (entry.ageMs >= types_1.AGE_STALE_MS) {
            lines.push(`  ${Colors_1.Colors.ageStale('⚠  Not touched in over 90 days — safe to remove')}`);
        }
        else if (entry.ageMs >= types_1.AGE_WARN_MS) {
            lines.push(`  ${Colors_1.Colors.ageWarn('·  Unused for over 30 days')}`);
        }
        return lines;
    }
    renderAgeField(entry) {
        if (entry.ageMs <= 0)
            return Colors_1.Colors.dim('–');
        if (entry.ageMs >= types_1.AGE_STALE_MS)
            return Colors_1.Colors.ageStale(entry.ageHuman + ' ⚠');
        if (entry.ageMs >= types_1.AGE_WARN_MS)
            return Colors_1.Colors.ageWarn(entry.ageHuman);
        return Colors_1.Colors.age(entry.ageHuman);
    }
    renderSection(title) {
        const dashes = Colors_1.Colors.dim('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─');
        return [`  ${Colors_1.Colors.sectionLabel(title.padEnd(14))}${dashes}`];
    }
    renderLocation(entry) {
        const label = (s) => Colors_1.Colors.sectionLabel(s.padEnd(14));
        return [
            `  ${label('Directory')}${entry.directory ? Colors_1.Colors.directory(entry.directory) : Colors_1.Colors.dim('–')}`,
            `  ${label('Project')}${entry.project ?? Colors_1.Colors.dim('–')}`,
            `  ${label('Git Branch')}${entry.gitBranch ? Colors_1.Colors.dim(entry.gitBranch) : Colors_1.Colors.dim('–')}`,
        ];
    }
    renderTopOffenders(entry) {
        const lines = [];
        for (const offender of entry.topOffenders) {
            const arrow = Colors_1.Colors.treeGlyph('→');
            const name = offender.name.padEnd(32);
            const size = Colors_1.Colors.size(offender.sizeHuman);
            lines.push(`  ${arrow} ${name}${size}`);
        }
        return lines;
    }
    renderRemoveHint(entry) {
        if (entry.isDockerEntry) {
            const cmd = Colors_1.Colors.removeCommand('disky clean docker');
            return `  ${Colors_1.Colors.dim('Remove Docker resources:')} ${cmd}`;
        }
        const cmd = Colors_1.Colors.removeCommand('disky clean');
        const id = Colors_1.Colors.removeId(String(entry.id));
        const sep = Colors_1.Colors.dim('  or  ');
        const pth = Colors_1.Colors.removePath(entry.displayPath);
        return `  ${Colors_1.Colors.dim('Remove this directory:')} ${cmd} ${id}${sep}${cmd} ${pth}`;
    }
}
exports.DetailRenderer = DetailRenderer;
//# sourceMappingURL=DetailRenderer.js.map