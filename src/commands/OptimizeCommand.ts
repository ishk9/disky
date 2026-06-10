import { ICommand } from '../interfaces/ICommand.js';
import { IOptimizeStep, OptimizeResult } from '../optimize/IOptimizeStep.js';
import { macosOptimizeSteps } from '../optimize/macosSteps.js';
import { OperationLog, IOperationLog } from '../core/OperationLog.js';
import { promptConfirm } from '../core/EntryResolver.js';
import { Colors } from '../renderers/Colors.js';

interface OptimizeCommandOptions {
  dryRun?: boolean;
  json?: boolean;
  /** Step keys to skip. */
  skip?: string[];
}

/**
 * `disky optimize` — runs reversible, user-level macOS maintenance steps
 * (flush DNS, rebuild Launch Services, reset caches). Mirrors `mo optimize`.
 * Dry-run-friendly, skippable, and audit-logged.
 */
export class OptimizeCommand implements ICommand {
  constructor(
    private readonly options: OptimizeCommandOptions = {},
    private readonly allSteps: IOptimizeStep[] = macosOptimizeSteps(),
    private readonly oplog: IOperationLog = new OperationLog(),
  ) {}

  async execute(): Promise<void> {
    const skip = new Set(this.options.skip ?? []);
    const steps = this.allSteps.filter((s) => !skip.has(s.key));
    const json = this.options.json ?? !process.stdout.isTTY;

    if (this.options.dryRun) {
      for (const step of steps) {
        this.oplog.record({
          op: 'optimize',
          label: step.key,
          path: step.key,
          bytes: 0,
          dryRun: true,
          success: true,
        });
      }
      if (json) {
        process.stdout.write(
          JSON.stringify(
            { dryRun: true, steps: steps.map((s) => ({ key: s.key, label: s.label })) },
            null,
            2,
          ) + '\n',
        );
        return;
      }
      console.log(`\n  ${Colors.brand('⚡ disky optimize')}  ${Colors.dim('(dry run)')}\n`);
      for (const s of steps) {
        console.log(`  ${Colors.prompt('•')} ${s.label}  ${Colors.dim(s.description)}`);
      }
      console.log(`\n  ${Colors.dim('No changes made.')}\n`);
      return;
    }

    if (!json) {
      console.log(`\n  ${Colors.brand('⚡ disky optimize')}\n`);
      for (const s of steps) {
        console.log(`  ${Colors.prompt('•')} ${s.label}  ${Colors.dim(s.description)}`);
      }
      console.log('');
      const confirmed = await promptConfirm(
        `  ${Colors.prompt(`Run ${steps.length} optimization ${steps.length === 1 ? 'step' : 'steps'}? [y/N]`)} `,
      );
      if (!confirmed) {
        console.log(`\n  ${Colors.dim('Aborted.')}\n`);
        return;
      }
      console.log('');
    }

    const results: OptimizeResult[] = [];
    for (const step of steps) {
      const result = step.run();
      results.push(result);
      this.oplog.record({
        op: 'optimize',
        label: step.key,
        path: step.key,
        bytes: 0,
        dryRun: false,
        success: result.success,
      });
      if (!json) {
        const mark = result.success ? Colors.success('✓') : Colors.error('✗');
        console.log(`  ${mark} ${step.label}`);
      }
    }

    if (json) {
      process.stdout.write(JSON.stringify({ dryRun: false, results }, null, 2) + '\n');
      return;
    }
    const ok = results.filter((r) => r.success).length;
    console.log(`\n  ${Colors.success(`✓ ${ok}/${results.length} steps completed`)}\n`);
  }
}
