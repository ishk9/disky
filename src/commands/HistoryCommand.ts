import { ICommand } from '../interfaces/ICommand.js';
import { IOperationLog, OperationLog, OperationRecord } from '../core/OperationLog.js';
import { Colors } from '../renderers/Colors.js';
import { formatBytes } from '../core/format.js';

interface HistoryCommandOptions {
  json?: boolean;
  limit?: number;
}

/** `disky history` — renders the JSONL operation audit trail. */
export class HistoryCommand implements ICommand {
  constructor(
    private readonly options: HistoryCommandOptions = {},
    private readonly oplog: IOperationLog = new OperationLog(),
  ) {}

  async execute(): Promise<void> {
    const limit = this.options.limit && this.options.limit > 0 ? this.options.limit : undefined;
    const records = this.oplog.read(limit);
    const json = this.options.json ?? !process.stdout.isTTY;

    if (json) {
      process.stdout.write(JSON.stringify(records, null, 2) + '\n');
      return;
    }

    console.log(`\n  ${Colors.brand('🧾 disky history')}\n`);
    if (records.length === 0) {
      console.log(`  ${Colors.dim('No operations recorded yet.')}\n`);
      return;
    }

    for (const record of records) {
      console.log(renderRecord(record));
    }
    console.log('');
  }
}

function renderRecord(record: OperationRecord): string {
  const mark = record.success ? Colors.success('✓') : Colors.error('✗');
  const dry = record.dryRun ? Colors.prompt('dry-run ') : '';
  const bytes = record.bytes > 0 ? ` · ${Colors.success(formatBytes(record.bytes))}` : '';
  return (
    `  ${mark} ${Colors.dim(record.ts)}  ${dry}${record.op.padEnd(10)} ` +
    `${Colors.dim(record.label.padEnd(18))} ${record.path}${bytes}`
  );
}
