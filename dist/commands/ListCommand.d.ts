import { ICommand } from '../interfaces/ICommand';
import { IScanner } from '../interfaces/IScanner';
interface ListCommandOptions {
    /** When false, show all large directories (--all mode). */
    artifactOnly: boolean;
}
/**
 * Handles `disky` and `disky --all`.
 */
export declare class ListCommand implements ICommand {
    private readonly options;
    private readonly scanner;
    private readonly cache;
    private readonly headerRenderer;
    private readonly tableRenderer;
    constructor(options: ListCommandOptions, scanner?: IScanner);
    execute(): Promise<void>;
    private buildFooter;
}
export {};
//# sourceMappingURL=ListCommand.d.ts.map