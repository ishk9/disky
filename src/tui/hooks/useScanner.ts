import { useState, useCallback, useRef, useEffect } from 'react';
import { Worker } from 'worker_threads';
import { ScanCache } from '../../core/ScanCache.js';
import { DiskEntry } from '../../types/index.js';

interface ScanState {
  loading: boolean;
  data: DiskEntry[] | null;
  error: string | null;
}

type WorkerMessage = { ok: true; entries: DiskEntry[] } | { ok: false; error: string };

const cache = new ScanCache();
const workerUrl = new URL('../workers/scanWorker.js', import.meta.url);

export function useScanner() {
  const [state, setState] = useState<ScanState>({ loading: false, data: null, error: null });
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

    setState({ loading: true, data: null, error: null });

    return new Promise<DiskEntry[] | null>((resolve) => {
      const worker = new Worker(workerUrl, { workerData: { artifactOnly } });
      activeWorker.current = worker;

      worker.once('message', (msg: WorkerMessage) => {
        if (activeWorker.current !== worker) return; // superseded
        if (msg.ok) {
          cache.save(msg.entries);
          setState({ loading: false, data: msg.entries, error: null });
          resolve(msg.entries);
        } else {
          setState({ loading: false, data: null, error: msg.error });
          resolve(null);
        }
        worker.terminate();
        activeWorker.current = null;
      });

      worker.once('error', (err) => {
        if (activeWorker.current !== worker) return;
        setState({ loading: false, data: null, error: err.message });
        resolve(null);
        activeWorker.current = null;
      });
    });
  }, []);

  return { ...state, scan };
}
