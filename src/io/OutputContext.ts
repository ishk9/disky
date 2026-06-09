/**
 * Resolved, process-wide output settings. Centralizes the decisions that were
 * previously ad hoc: whether to emit JSON, whether to colorize, and whether
 * this is a dry run. Resolved once from global CLI options + the TTY state and
 * injected into commands/renderers.
 */
export interface OutputOptions {
  /** Explicit --json / --no-json. When undefined, auto-detect from the TTY. */
  json?: boolean;
  dryRun?: boolean;
  debug?: boolean;
  /** Override TTY detection (tests). Defaults to process.stdout.isTTY. */
  isTTY?: boolean;
  /** Force color on/off. Defaults to: on when TTY and not JSON. */
  color?: boolean;
}

export class OutputContext {
  readonly isTTY: boolean;
  readonly json: boolean;
  readonly dryRun: boolean;
  readonly debug: boolean;
  readonly color: boolean;

  constructor(opts: OutputOptions = {}) {
    this.isTTY = opts.isTTY ?? Boolean(process.stdout.isTTY);
    // Auto-JSON when piped (non-TTY) unless explicitly overridden. This makes
    // `disky scan | jq` work without a flag, matching the best-in-class CLIs.
    this.json = opts.json ?? !this.isTTY;
    this.dryRun = opts.dryRun ?? false;
    this.debug = opts.debug ?? false;
    this.color = opts.color ?? (this.isTTY && !this.json);
  }

  /** True when human-formatted, colorized output should be rendered. */
  get human(): boolean {
    return !this.json;
  }
}
