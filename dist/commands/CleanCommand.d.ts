import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
interface CleanCommandOptions {
    /** Numeric ID of a single entry to remove. Takes priority over targetPath. */
    id?: number;
    /** Path of a specific directory to remove. */
    targetPath?: string;
    /** Preview what would be deleted without removing anything. */
    dryRun?: boolean;
    /** CLI-provided paths to exclude from cleanup. */
    excludePaths?: string[];
}
/**
 * Handles `disky clean`, `disky clean <id>`, and `disky clean <path>`.
 */
export declare class CleanCommand implements ICommand {
    private readonly options;
    private readonly scanner;
    private readonly cache;
    private readonly config;
    private readonly cleanRenderer;
    private readonly tableRenderer;
    constructor(options?: CleanCommandOptions, scanner?: IScanner);
    execute(): Promise<void>;
    private removeSpecific;
    private removeBulk;
    private resolveEntry;
    /**
     * Removes an entry from disk (or prunes Docker resources) and returns the result.
     * Returns null on failure.
     */
    private remove;
    private getEffectiveExclusions;
    private isExcluded;
    private expandPath;
    private prompt;
}
export {};
//# sourceMappingURL=CleanCommand.d.ts.map