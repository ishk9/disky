import { execSync } from 'child_process';

export interface OptimizeResult {
  key: string;
  label: string;
  success: boolean;
  message?: string;
}

/**
 * One maintenance operation. New steps plug in as new strategies (OCP) — the
 * command iterates over a list and never needs editing to add one.
 */
export interface IOptimizeStep {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  run(): OptimizeResult;
}

/** An optimize step backed by a shell command. */
export class ShellOptimizeStep implements IOptimizeStep {
  constructor(
    readonly key: string,
    readonly label: string,
    readonly description: string,
    private readonly command: string,
  ) {}

  run(): OptimizeResult {
    try {
      execSync(this.command, { stdio: 'pipe', timeout: 30_000 });
      return { key: this.key, label: this.label, success: true };
    } catch (err) {
      return {
        key: this.key,
        label: this.label,
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
