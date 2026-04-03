import { ICommand } from '../interfaces/ICommand';
/**
 * Handles bare `disky` — shows the branded splash screen and command list.
 * No disk scanning is performed.
 */
export declare class WelcomeCommand implements ICommand {
    private readonly headerRenderer;
    execute(): Promise<void>;
}
//# sourceMappingURL=WelcomeCommand.d.ts.map