import { DiskEntry, AGE_WARN_MS, AGE_STALE_MS } from '../types/index.js';
import { Colors } from './Colors.js';
import { IRenderer } from '../interfaces/IRenderer.js';
import { getCleanPolicy } from '../core/CleanPolicy.js';

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

    const ageDisplay = this.renderAgeField(entry);

    const lines = [
      `  ${label('ID')}${Colors.id(String(entry.id))}`,
      `  ${label('Type')}${Colors.artifact(entry.artifactType.color)(entry.artifactType.label)}`,
      `  ${label('Cleanup')}${this.renderCleanupPolicy(entry)}`,
      `  ${label('Size')}${Colors.size(entry.sizeHuman)}`,
      `  ${label('Path')}${Colors.path(entry.displayPath)}`,
      `  ${label('Project')}${entry.project ? Colors.project(entry.project) : Colors.dim('–')}`,
      `  ${label('Last Modified')}${ageDisplay}`,
    ];

    if (entry.ageMs >= AGE_STALE_MS) {
      lines.push(`  ${Colors.ageStale(`⚠  Not touched in over 90 days — ${getCleanPolicy(entry.artifactType) === 'auto' ? 'safe to remove' : 'inspect before removing anything'}`)}`);
    } else if (entry.ageMs >= AGE_WARN_MS) {
      lines.push(`  ${Colors.ageWarn('·  Unused for over 30 days')}`);
    }

    return lines;
  }

  private renderAgeField(entry: DiskEntry): string {
    if (entry.ageMs <= 0)              return Colors.dim('–');
    if (entry.ageMs >= AGE_STALE_MS)   return Colors.ageStale(entry.ageHuman + ' ⚠');
    if (entry.ageMs >= AGE_WARN_MS)    return Colors.ageWarn(entry.ageHuman);
    return Colors.age(entry.ageHuman);
  }

  private renderCleanupPolicy(entry: DiskEntry): string {
    const policy = getCleanPolicy(entry.artifactType);
    if (policy === 'auto') return Colors.success('auto');
    return Colors.dim(policy);
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

    const policy = getCleanPolicy(entry.artifactType);
    if (policy === 'locked') {
      const reason = entry.artifactType.cleanReason ?? 'Default clean skips this entry.';
      return `  ${Colors.dim(reason)}\n  ${Colors.dim('Force target only:')} ${Colors.removeCommand('disky clean')} ${Colors.removeId(String(entry.id))} ${Colors.removeCommand('--force')}`;
    }
    if (policy === 'inspect') {
      return `  ${Colors.dim(entry.artifactType.cleanReason ?? 'Review this directory manually before removing anything.')}`;
    }

    const cmd  = Colors.removeCommand('disky clean');
    const id   = Colors.removeId(String(entry.id));
    const sep  = Colors.dim('  or  ');
    const pth  = Colors.removePath(entry.displayPath);
    return `  ${Colors.dim('Remove this directory:')} ${cmd} ${id}${sep}${cmd} ${pth}`;
  }
}
