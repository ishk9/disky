import { execFileSync } from 'child_process';
import { ICommand } from '../interfaces/ICommand.js';
import { Colors } from '../renderers/Colors.js';

interface UpdateCommandOptions {
  nightly?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

export interface UpdateRunner {
  run(cmd: string, args: string[]): boolean;
}

class NpmUpdateRunner implements UpdateRunner {
  run(cmd: string, args: string[]): boolean {
    try {
      execFileSync(cmd, args, { stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  }
}

/** `disky update` — npm-channel self update. */
export class UpdateCommand implements ICommand {
  constructor(
    private readonly options: UpdateCommandOptions = {},
    private readonly runner: UpdateRunner = new NpmUpdateRunner(),
  ) {}

  async execute(): Promise<void> {
    const tag = this.options.nightly ? 'next' : 'latest';
    const pkg = `@ishk9/disky@${tag}`;
    const args = ['i', '-g', pkg];
    const json = this.options.json ?? !process.stdout.isTTY;

    if (this.options.dryRun) {
      this.output({ package: pkg, command: ['npm', ...args], dryRun: true, success: true }, json);
      return;
    }

    const success = this.runner.run('npm', args);
    this.output({ package: pkg, command: ['npm', ...args], dryRun: false, success }, json);
  }

  private output(
    result: { package: string; command: string[]; dryRun: boolean; success: boolean },
    json: boolean,
  ): void {
    if (json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return;
    }
    if (result.dryRun) {
      console.log(`\n  ${Colors.prompt('[DRY RUN]')} ${result.command.join(' ')}\n`);
      return;
    }
    const color = result.success ? Colors.success : Colors.error;
    console.log(
      `\n  ${color(result.success ? `Updated ${result.package}` : `Failed to update ${result.package}`)}\n`,
    );
  }
}
