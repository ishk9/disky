import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
interface ListCommandOptions {
    /** When false, show all large directories (--all mode). */
    artifactOnly: boolean;
    /**
     * Optional minimum size in bytes. Only entries at or above this threshold
     * are shown. Parses strings like "500MB", "1.5GB", "100KB".
     */
    minBytes?: number;
    /** Sort mode: size (default), age (oldest first), or type (grouped by label). */
    sortMode?: 'size' | 'age' | 'type';
    /** Output results as JSON instead of a formatted table. */
    json?: boolean;
    /** Limit output to the top N entries. */
    top?: number;
}
/**
 * Handles `disky scan`, `disky scan --all`, and `disky scan --min <size>`.
 */
export declare class ListCommand implements ICommand {
    private readonly options;
    private readonly scanner;
    private readonly cache;
    private readonly headerRenderer;
    private readonly tableRenderer;
    constructor(options: ListCommandOptions, scanner?: IScanner);
    execute(): Promise<void>;
    private sortEntries;
    private buildFooter;
}
/**
 * Parses a human-readable size string into bytes.
 * Accepts: "500MB", "1.5GB", "100KB", "2048" (raw bytes).
 * Returns NaN if the string is not parseable.
 */
export declare function parseMinSize(input: string): number;
export {};
//# sourceMappingURL=ListCommand.d.ts.map