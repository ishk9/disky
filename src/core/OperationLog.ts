import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** One destructive (or previewed) operation, as stored in the audit log. */
export interface OperationRecord {
  /** ISO-8601 timestamp. */
  ts: string;
  /** Operation kind: 'clean', 'sweep', 'uninstall', 'optimize', … */
  op: string;
  /** Artifact/category label, e.g. "node_modules", "system-cache". */
  label: string;
  /** Absolute path acted on ('__docker__' for Docker). */
  path: string;
  /** Bytes freed (0 on failure or dry-run). */
  bytes: number;
  /** True when this was a preview, not an actual removal. */
  dryRun: boolean;
  /** Whether the operation succeeded. */
  success: boolean;
}

/**
 * Append-only audit trail of destructive operations. A tool whose job is
 * deletion should record what it removed; this backs `disky history`.
 */
export interface IOperationLog {
  /** Append a record (timestamp added automatically). No-op if disabled. */
  record(entry: Omit<OperationRecord, 'ts'>): void;
  /** Read recent records, newest first, up to `limit`. */
  read(limit?: number): OperationRecord[];
}

const CONFIG_DIR = path.join(os.homedir(), '.disky');
const LOG_FILE = path.join(CONFIG_DIR, 'operations.log');

/** JSONL-backed operation log. Disable via `DISKY_NO_OPLOG=1`. */
export class OperationLog implements IOperationLog {
  constructor(private readonly file: string = LOG_FILE) {}

  private get disabled(): boolean {
    return process.env.DISKY_NO_OPLOG === '1';
  }

  record(entry: Omit<OperationRecord, 'ts'>): void {
    if (this.disabled) return;
    const record: OperationRecord = { ts: new Date().toISOString(), ...entry };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.appendFileSync(this.file, JSON.stringify(record) + '\n', 'utf8');
    } catch {
      // Logging must never block a cleanup; swallow I/O errors.
    }
  }

  read(limit?: number): OperationRecord[] {
    let records: OperationRecord[];
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      records = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => JSON.parse(l) as OperationRecord);
    } catch {
      return [];
    }
    records.reverse(); // newest first
    return limit !== undefined ? records.slice(0, limit) : records;
  }
}
