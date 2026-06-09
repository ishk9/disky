import { DiskEntry } from '../types/index.js';
import { Colors } from './Colors.js';
import { IRenderer } from '../interfaces/IRenderer.js';
import { formatBytes } from '../core/DiskScanner.js';

export interface RemovalResult {
  id: number;
  label: string;
  displayPath: string;
  bytesFreed: number;
}

/**
 * Renders the bulk-clean scanning list and per-removal progress lines.
 */
export class CleanRenderer implements IRenderer<DiskEntry[]> {
  render(entries: DiskEntry[]): string {
    if (entries.length === 0) {
      return `\n  ${Colors.success('✓')} ${Colors.dim('No cleanable entries found.')}\n`;
    }

    const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);

    const idW   = Math.max(4, ...entries.map((e) => String(e.id).length)) + 2;
    const sizeW = Math.max(6, ...entries.map((e) => e.sizeHuman.length)) + 2;
    const typeW = Math.max(6, ...entries.map((e) => e.artifactType.label.length)) + 2;
    const pathW = Math.max(6, ...entries.map((e) => e.displayPath.length)) + 2;

    const headerRow = [
      Colors.header('ID'.padEnd(idW)),
      Colors.header('SIZE'.padEnd(sizeW)),
      Colors.header('TYPE'.padEnd(typeW)),
      Colors.header('PATH'.padEnd(pathW)),
    ].join('');

    const rows = entries.map((e) => {
      return [
        Colors.id(String(e.id).padEnd(idW)),
        Colors.size(e.sizeHuman.padEnd(sizeW)),
        Colors.artifact(e.artifactType.color)(e.artifactType.label.padEnd(typeW)),
        Colors.path(e.displayPath.padEnd(pathW)),
      ].join('');
    });

    const lines = [
      '',
      `  ${Colors.dim('Scanning for disk hogs...')}`,
      '',
      `  ${Colors.prompt(`Found ${entries.length} removable director${entries.length !== 1 ? 'ies' : 'y'}:`)}`,
      '',
      `  ${headerRow}`,
      ...rows.map((r) => `  ${r}`),
      '',
      `  ${Colors.dim(`Total recoverable: ${formatBytes(totalBytes)}`)}`,
      '',
    ];

    return lines.join('\n');
  }

  renderRemovalResults(results: RemovalResult[]): string {
    const lines: string[] = [''];
    const totalFreed = results.reduce((sum, r) => sum + r.bytesFreed, 0);

    for (const r of results) {
      const id    = Colors.id(`[${r.id}]`);
      const label = Colors.artifact('green')(r.label.padEnd(16));
      const pth   = Colors.dim(r.displayPath.padEnd(40));
      const freed = Colors.size(`(${formatBytes(r.bytesFreed)} freed)`);
      lines.push(`  ${Colors.success('✓')} ${id} Removed ${label} ${pth} ${freed}`);
    }

    lines.push('');
    lines.push(`  ${Colors.dim(`${formatBytes(totalFreed)} freed.`)}`);
    lines.push('');

    return lines.join('\n');
  }
}
