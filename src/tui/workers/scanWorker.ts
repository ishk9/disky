import { parentPort, workerData } from 'worker_threads';
import { DiskScanner } from '../../core/DiskScanner.js';
import type { ScanProgress } from '../../interfaces/IScanner.js';
import type { DiskEntry } from '../../types/index.js';

/** Messages streamed from the scan worker to the UI. */
export type WorkerMessage =
  | { type: 'progress'; progress: ScanProgress }
  | { type: 'done'; entries: DiskEntry[] }
  | { type: 'error'; error: string };

(async () => {
  try {
    const scanner = new DiskScanner();
    const entries = await scanner.scan(workerData.artifactOnly, {
      onProgress: (progress) => parentPort!.postMessage({ type: 'progress', progress }),
    });
    parentPort!.postMessage({ type: 'done', entries });
  } catch (err) {
    parentPort!.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
})();
