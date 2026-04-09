import { DiskEntry } from '../types';
import { IRenderer } from '../interfaces/IRenderer';
/**
 * Renders the full detail view for a single disk entry (`disky <id>` / `disky <path>`).
 */
export declare class DetailRenderer implements IRenderer<DiskEntry> {
    render(entry: DiskEntry): string;
    private renderFields;
    private renderAgeField;
    private renderSection;
    private renderLocation;
    private renderTopOffenders;
    private renderRemoveHint;
}
//# sourceMappingURL=DetailRenderer.d.ts.map