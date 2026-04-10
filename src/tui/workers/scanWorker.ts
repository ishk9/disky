import { parentPort, workerData } from 'worker_threads';
import { DiskScanner } from '../../core/DiskScanner.js';

(async () => {
  try {
    const scanner = new DiskScanner();
    const entries = await scanner.scan(workerData.artifactOnly);
    parentPort!.postMessage({ ok: true, entries });
  } catch (err) {
    parentPort!.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
})();
