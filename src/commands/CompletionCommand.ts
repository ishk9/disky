import { ICommand } from '../interfaces/ICommand.js';

export type CompletionShell = 'zsh' | 'bash' | 'fish';

interface CompletionCommandOptions {
  shell: CompletionShell;
}

const COMMANDS = [
  'scan',
  'clean',
  'watch',
  'tui',
  'sweep',
  'installer',
  'analyze',
  'status',
  'uninstall',
  'optimize',
  'history',
  'whitelist',
  'touchid',
  'completion',
  'update',
];

/** `disky completion <shell>` — prints a shell completion script. */
export class CompletionCommand implements ICommand {
  constructor(private readonly options: CompletionCommandOptions) {}

  async execute(): Promise<void> {
    process.stdout.write(completionFor(this.options.shell) + '\n');
  }
}

export function completionFor(shell: CompletionShell): string {
  switch (shell) {
    case 'bash':
      return bashCompletion();
    case 'fish':
      return fishCompletion();
    case 'zsh':
      return zshCompletion();
  }
}

function zshCompletion(): string {
  return `#compdef disky
_disky() {
  _arguments '1:command:(${COMMANDS.join(' ')})' '*::arg:->args'
}
_disky "$@"`;
}

function bashCompletion(): string {
  return `_disky_completion() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "${COMMANDS.join(' ')}" -- "$cur") )
}
complete -F _disky_completion disky`;
}

function fishCompletion(): string {
  return COMMANDS.map((cmd) => `complete -c disky -f -a ${cmd}`).join('\n');
}
