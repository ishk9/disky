import { DiskEntry, AGE_WARN_MS, AGE_STALE_MS } from '../types';
import { Colors } from './Colors';
import { IRenderer } from '../interfaces/IRenderer';

interface TableOptions {
  /** IDs of newly appeared entries (highlighted green in watch mode). */
  newIds?: Set<number>;
  /** Paths of entries that just disappeared (flash red in watch mode). */
  removedEntries?: DiskEntry[];
}

const COLS = {
  id:      { header: 'ID',      min: 6  },
  size:    { header: 'SIZE',    min: 10 },
  type:    { header: 'TYPE',    min: 15 },
  path:    { header: 'PATH',    min: 30 },
  project: { header: 'PROJECT', min: 15 },
  age:     { header: 'AGE',     min: 10 },
} as const;

type ColKey = keyof typeof COLS;

/**
 * Renders the main disk-hog table with dynamic column widths.
 */
export class TableRenderer implements IRenderer<DiskEntry[]> {
  render(entries: DiskEntry[], options: TableOptions = {}): string {
    const allEntries = [
      ...(options.removedEntries ?? []),
      ...entries,
    ];

    const widths = this.calculateWidths(allEntries);
    const lines: string[] = [];

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

  private calculateWidths(entries: DiskEntry[]): Record<ColKey, number> {
    const widths: Record<ColKey, number> = {
      id:      COLS.id.min,
      size:    COLS.size.min,
      type:    COLS.type.min,
      path:    COLS.path.min,
      project: COLS.project.min,
      age:     COLS.age.min,
    };

    for (const e of entries) {
      widths.id      = Math.max(widths.id,      String(e.id).length + 2);
      widths.size    = Math.max(widths.size,    e.sizeHuman.length + 2);
      widths.type    = Math.max(widths.type,    e.artifactType.label.length + 2);
      widths.path    = Math.max(widths.path,    e.displayPath.length + 2);
      widths.project = Math.max(widths.project, (e.project ?? '–').length + 2);
      widths.age     = Math.max(widths.age,     e.ageHuman.length + 2);
    }

    return widths;
  }

  private renderHeader(widths: Record<ColKey, number>): string {
    const cols: ColKey[] = ['id', 'size', 'type', 'path', 'project', 'age'];
    const parts = cols.map((k) => Colors.header(COLS[k].header.padEnd(widths[k])));
    return '  ' + parts.join('');
  }

  private renderRow(
    entry: DiskEntry,
    widths: Record<ColKey, number>,
    highlight: 'normal' | 'new' | 'removed',
  ): string {
    const idStr      = String(entry.id);
    const sizeStr    = entry.sizeHuman;
    const typeStr    = entry.artifactType.label;
    const pathStr    = entry.displayPath;
    const projectStr = entry.project ?? '–';
    const ageStr     = entry.ageHuman;

    const cells = [
      Colors.id(idStr.padEnd(widths.id)),
      Colors.size(sizeStr.padEnd(widths.size)),
      Colors.artifact(entry.artifactType.color)(typeStr.padEnd(widths.type)),
      Colors.path(pathStr.padEnd(widths.path)),
      entry.project
        ? Colors.project(projectStr.padEnd(widths.project))
        : Colors.dim(projectStr.padEnd(widths.project)),
      this.renderAge(entry, widths.age),
    ];

    const row = '  ' + cells.join('');

    if (highlight === 'new')     return Colors.newEntry(row);
    if (highlight === 'removed') return Colors.removedEntry(row);
    return row;
  }

  private renderAge(entry: DiskEntry, colWidth: number): string {
    if (entry.ageMs <= 0) return Colors.dim(entry.ageHuman.padEnd(colWidth));

    if (entry.ageMs >= AGE_STALE_MS) {
      return Colors.ageStale((entry.ageHuman + ' ⚠').padEnd(colWidth));
    }
    if (entry.ageMs >= AGE_WARN_MS) {
      return Colors.ageWarn(entry.ageHuman.padEnd(colWidth));
    }
    return Colors.age(entry.ageHuman.padEnd(colWidth));
  }
}
