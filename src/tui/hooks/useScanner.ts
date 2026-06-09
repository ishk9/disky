import { useState, useCallback, useRef, useEffect } from 'react';
import { Worker } from 'worker_threads';
import { ScanCache } from '../../core/ScanCache.js';
import { DiskEntry } from '../../types/index.js';
import type { ScanProgress } from '../../interfaces/IScanner.js';
import type { WorkerMessage } from '../workers/scanWorker.js';

interface ScanState {
  loading: boolean;
  data: DiskEntry[] | null;
  error: string | null;
  progress: ScanProgress | null;
}

const cache = new ScanCache();
const workerUrl = new URL('../workers/scanWorker.js', import.meta.url);

export function useScanner() {
  const [state, setState] = useState<ScanState>({
    loading: false,
    data: null,
    error: null,
    progress: null,
  });
  const activeWorker = useRef<Worker | null>(null);

  // Terminate any in-flight worker on unmount
  useEffect(() => {
    return () => {
      activeWorker.current?.terminate();
      activeWorker.current = null;
    };
  }, []);

  const scan = useCallback(async (artifactOnly = true): Promise<DiskEntry[] | null> => {
    // Cancel any prior in-flight scan so its results can't clobber the new one
    activeWorker.current?.terminate();
    activeWorker.current = null;

    setState({ loading: true, data: null, error: null, progress: null });

    return new Promise<DiskEntry[] | null>((resolve) => {
      const worker = new Worker(workerUrl, { workerData: { artifactOnly } });
      activeWorker.current = worker;

      const finish = (next: ScanState, value: DiskEntry[] | null) => {
        setState(next);
        resolve(value);
        worker.terminate();
        activeWorker.current = null;
      };

      worker.on('message', (msg: WorkerMessage) => {
        if (activeWorker.current !== worker) return; // superseded
        if (msg.type === 'progress') {
          setState((s) => (s.loading ? { ...s, progress: msg.progress } : s));
        } else if (msg.type === 'done') {
          cache.save(msg.entries);
          finish({ loading: false, data: msg.entries, error: null, progress: null }, msg.entries);
        } else {
          finish({ loading: false, data: null, error: msg.error, progress: null }, null);
        }
      });

      worker.once('error', (err) => {
        if (activeWorker.current !== worker) return;
        finish({ loading: false, data: null, error: err.message, progress: null }, null);
      });
    });
  }, []);

  return { ...state, scan };
}
