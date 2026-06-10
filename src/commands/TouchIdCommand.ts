import { ICommand } from '../interfaces/ICommand.js';
import { ISudoRunner } from '../platform/ISudoRunner.js';
import { MacSudoRunner } from '../platform/macos/MacSudoRunner.js';
import { Colors } from '../renderers/Colors.js';

export type TouchIdAction = 'enable' | 'disable';

interface TouchIdCommandOptions {
  action: TouchIdAction;
  dryRun?: boolean;
  json?: boolean;
}

const SUDO_LOCAL = '/etc/pam.d/sudo_local';
const PAM_TID_LINE = 'auth       sufficient     pam_tid.so';

/** `disky touchid enable|disable` — idempotently manages Touch ID for sudo. */
export class TouchIdCommand implements ICommand {
  constructor(
    private readonly options: TouchIdCommandOptions,
    private readonly runner: ISudoRunner = new MacSudoRunner(),
  ) {}

  async execute(): Promise<void> {
    const current = this.runner.readFile(SUDO_LOCAL);
    const hasTouchId = hasActivePamTid(current);
    const json = this.options.json ?? !process.stdout.isTTY;

    if (this.options.action === 'enable') {
      await this.enable(current, hasTouchId, json);
    } else {
      await this.disable(current, hasTouchId, json);
    }
  }

  private async enable(current: string | null, hasTouchId: boolean, json: boolean): Promise<void> {
    if (hasTouchId) {
      this.output(
        {
          action: 'enable',
          changed: false,
          dryRun: false,
          message: 'Touch ID is already enabled.',
        },
        json,
      );
      return;
    }

    const next = appendPamLine(current);
    if (this.options.dryRun) {
      this.output(
        {
          action: 'enable',
          changed: true,
          dryRun: true,
          message: `[DRY RUN] Would write ${SUDO_LOCAL}.`,
          preview: next,
        },
        json,
      );
      return;
    }

    const ok = this.runner.writeFile(SUDO_LOCAL, next);
    this.output(
      {
        action: 'enable',
        changed: ok,
        dryRun: false,
        message: ok ? 'Touch ID enabled for sudo.' : 'Failed to update sudo_local.',
      },
      json,
      !ok,
    );
  }

  private async disable(current: string | null, hasTouchId: boolean, json: boolean): Promise<void> {
    if (!hasTouchId || !current) {
      this.output(
        {
          action: 'disable',
          changed: false,
          dryRun: false,
          message: 'Touch ID is already disabled.',
        },
        json,
      );
      return;
    }

    const next = removePamLine(current);
    if (this.options.dryRun) {
      this.output(
        {
          action: 'disable',
          changed: true,
          dryRun: true,
          message: `[DRY RUN] Would remove pam_tid.so from ${SUDO_LOCAL}.`,
          preview: next,
        },
        json,
      );
      return;
    }

    const ok = hasAnyLines(next)
      ? this.runner.writeFile(SUDO_LOCAL, next)
      : this.runner.removeFile(SUDO_LOCAL);
    this.output(
      {
        action: 'disable',
        changed: ok,
        dryRun: false,
        message: ok ? 'Touch ID disabled for sudo.' : 'Failed to update sudo_local.',
      },
      json,
      !ok,
    );
  }

  private output(
    result: {
      action: TouchIdAction;
      changed: boolean;
      dryRun: boolean;
      message: string;
      preview?: string;
    },
    json: boolean,
    error = false,
  ): void {
    if (json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return;
    }
    const color = error ? Colors.error : result.dryRun ? Colors.prompt : Colors.success;
    console.log(`\n  ${color(result.message)}\n`);
    if (result.preview) console.log(Colors.dim(result.preview));
  }
}

function appendPamLine(current: string | null): string {
  const base = current?.trimEnd();
  const prefix = base && base.length > 0 ? base + '\n' : '# sudo_local: local sudo policy\n';
  return prefix + PAM_TID_LINE + '\n';
}

function removePamLine(current: string): string {
  return (
    current
      .split('\n')
      .filter((line) => !isActivePamTidLine(line))
      .join('\n')
      .trimEnd() + '\n'
  );
}

function hasActivePamTid(content: string | null): boolean {
  return Boolean(content?.split('\n').some(isActivePamTidLine));
}

function isActivePamTidLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && !trimmed.startsWith('#') && /\bpam_tid\.so\b/.test(trimmed);
}

function hasAnyLines(content: string): boolean {
  return content
    .split('\n')
    .map((line) => line.trim())
    .some((line) => line.length > 0);
}
