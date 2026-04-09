import { DiskEntry } from '../types';
import { IRenderer } from '../interfaces/IRenderer';
interface TableOptions {
    /** IDs of newly appeared entries (highlighted green in watch mode). */
    newIds?: Set<number>;
    /** Paths of entries that just disappeared (flash red in watch mode). */
    removedEntries?: DiskEntry[];
}
/**
 * Renders the main disk-hog table with dynamic column widths.
 */
export declare class TableRenderer implements IRenderer<DiskEntry[]> {
    render(entries: DiskEntry[], options?: TableOptions): string;
    private calculateWidths;
    private renderHeader;
    private renderRow;
    private renderAge;
}
export {};
//# sourceMappingURL=TableRenderer.d.ts.map