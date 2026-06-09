import { ScanProgress } from '../interfaces/IScanner.js';

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
/** ~4fps, per DESIGN.md's animation cap. */
const FRAME_MS = 250;
const CLEAR_LINE = '\r\x1b[2K';

/**
 * Renders a live scan spinner to stderr (so stdout stays clean for pipes/JSON).
 * Throttled to ~4fps. Fixes the silent multi-second hang during a scan.
 */
export class ProgressReporter {
  private frame = 0;
  private lastRender = 0;
  private active = false;

  /** @param enabled typically `process.stdout.isTTY && !json` */
  constructor(
    private readonly enabled: boolean,
    private readonly write: (s: string) => void = (s) => void process.stderr.write(s),
    private readonly now: () => number = () => Date.now(),
  ) {}

  update = (p: ScanProgress): void => {
    if (!this.enabled) return;
    const t = this.now();
    if (this.active && t - this.lastRender < FRAME_MS) return;
    this.lastRender = t;
    this.active = true;
    const spin = SPINNER[this.frame++ % SPINNER.length];
    this.write(`${CLEAR_LINE}  ${spin} ${label(p)}`);
  };

  /** Clear the spinner line before final output is printed. */
  done(): void {
    if (this.enabled && this.active) this.write(CLEAR_LINE);
    this.active = false;
  }
}

function label(p: ScanProgress): string {
  if (p.phase === 'find') return 'searching for artifacts…';
  if (p.phase === 'docker') return 'checking Docker…';
  const total = p.total > 0 ? `/${p.total}` : '';
  return `sizing ${p.scanned}${total} · ${p.found} found`;
}
