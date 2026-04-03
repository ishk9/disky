import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
/**
 * Handles `disky watch` — real-time terminal monitor with 5s polling.
 *
 * Highlights newly appeared entries in green for one cycle and
 * fades removed entries in red before they disappear.
 */
export declare class WatchCommand implements ICommand {
    private readonly scanner;
    private readonly cache;
    private readonly headerRenderer;
    private readonly tableRenderer;
    private previousIds;
    private previousEntries;
    constructor(scanner?: IScanner);
    execute(): Promise<void>;
    private tick;
    private redraw;
    private buildFooter;
    private sleep;
}
//# sourceMappingURL=WatchCommand.d.ts.map