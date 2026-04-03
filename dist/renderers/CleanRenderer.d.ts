import { DiskEntry } from '../types';
import { IRenderer } from '../interfaces/IRenderer';
export interface RemovalResult {
    id: number;
    label: string;
    displayPath: string;
    bytesFreed: number;
}
/**
 * Renders the bulk-clean scanning list and per-removal progress lines.
 */
export declare class CleanRenderer implements IRenderer<DiskEntry[]> {
    render(entries: DiskEntry[]): string;
    renderRemovalResults(results: RemovalResult[]): string;
}
//# sourceMappingURL=CleanRenderer.d.ts.map