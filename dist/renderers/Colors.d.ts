import chalk from 'chalk';
import { ArtifactColorKey } from '../types';
/**
 * Centralised color palette — single place to change the entire visual theme.
 */
export declare const Colors: {
    readonly id: chalk.Chalk;
    readonly size: chalk.Chalk;
    readonly path: chalk.Chalk;
    readonly project: chalk.Chalk;
    readonly age: chalk.Chalk;
    readonly header: chalk.Chalk;
    readonly dim: chalk.Chalk;
    readonly brand: chalk.Chalk;
    readonly tagline: chalk.Chalk;
    readonly watching: chalk.Chalk;
    readonly success: chalk.Chalk;
    readonly error: chalk.Chalk;
    readonly prompt: chalk.Chalk;
    readonly directory: chalk.Chalk;
    readonly sectionLabel: chalk.Chalk;
    readonly treeGlyph: chalk.Chalk;
    readonly removeCommand: chalk.Chalk;
    readonly removePath: chalk.Chalk;
    readonly removeId: chalk.Chalk;
    readonly newEntry: chalk.Chalk;
    readonly removedEntry: chalk.Chalk;
    /** Returns the chalk instance for a given ArtifactColorKey. */
    readonly artifact: (color: ArtifactColorKey) => chalk.Chalk;
};
//# sourceMappingURL=Colors.d.ts.map