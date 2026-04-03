import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
interface DetailCommandOptions {
    /** Numeric ID from the last scan table. Takes priority over path. */
    id?: number;
    /** Absolute or ~ path of the directory. */
    targetPath?: string;
}
/**
 * Handles `disky <id>` and `disky <path>`.
 * Tries to resolve from the scan cache first; falls back to a live scan.
 */
export declare class DetailCommand implements ICommand {
    private readonly options;
    private readonly scanner;
    private readonly cache;
    private readonly renderer;
    constructor(options: DetailCommandOptions, scanner?: IScanner);
    execute(): Promise<void>;
    private resolveEntry;
    private expandPath;
    private promptDelete;
    private removeEntry;
}
export {};
//# sourceMappingURL=DetailCommand.d.ts.map