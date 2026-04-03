import { DiskEntry } from '../types';
import { Colors } from './Colors';
import { IRenderer } from '../interfaces/IRenderer';

/**
 * Renders the full detail view for a single disk entry (`disky <id>` / `disky <path>`).
 */
export class DetailRenderer implements IRenderer<DiskEntry> {
  render(entry: DiskEntry): string {
    const lines: string[] = [''];

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

  private renderFields(entry: DiskEntry): string[] {
    const label = (s: string) => Colors.sectionLabel(s.padEnd(14));

    return [
      `  ${label('ID')}${Colors.id(String(entry.id))}`,
      `  ${label('Type')}${Colors.artifact(entry.artifactType.color)(entry.artifactType.label)}`,
      `  ${label('Size')}${Colors.size(entry.sizeHuman)}`,
      `  ${label('Path')}${Colors.path(entry.displayPath)}`,
      `  ${label('Project')}${entry.project ? Colors.project(entry.project) : Colors.dim('–')}`,
      `  ${label('Last Modified')}${entry.ageMs > 0 ? Colors.age(entry.ageHuman) : Colors.dim('–')}`,
    ];
  }

  private renderSection(title: string): string[] {
    const dashes = Colors.dim('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─');
    return [`  ${Colors.sectionLabel(title.padEnd(14))}${dashes}`];
  }

  private renderLocation(entry: DiskEntry): string[] {
    const label = (s: string) => Colors.sectionLabel(s.padEnd(14));

    return [
      `  ${label('Directory')}${entry.directory ? Colors.directory(entry.directory) : Colors.dim('–')}`,
      `  ${label('Project')}${entry.project ?? Colors.dim('–')}`,
      `  ${label('Git Branch')}${entry.gitBranch ? Colors.dim(entry.gitBranch) : Colors.dim('–')}`,
    ];
  }

  private renderTopOffenders(entry: DiskEntry): string[] {
    const lines: string[] = [];

    for (const offender of entry.topOffenders) {
      const arrow = Colors.treeGlyph('→');
      const name  = offender.name.padEnd(32);
      const size  = Colors.size(offender.sizeHuman);
      lines.push(`  ${arrow} ${name}${size}`);
    }

    return lines;
  }

  private renderRemoveHint(entry: DiskEntry): string {
    if (entry.isDockerEntry) {
      const cmd = Colors.removeCommand('disky clean docker');
      return `  ${Colors.dim('Remove Docker resources:')} ${cmd}`;
    }

    const cmd  = Colors.removeCommand('disky clean');
    const id   = Colors.removeId(String(entry.id));
    const sep  = Colors.dim('  or  ');
    const pth  = Colors.removePath(entry.displayPath);
    return `  ${Colors.dim('Remove this directory:')} ${cmd} ${id}${sep}${cmd} ${pth}`;
  }
}
