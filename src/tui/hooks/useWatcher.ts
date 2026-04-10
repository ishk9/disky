import { useState, useEffect, useRef, useCallback } from 'react';
import { DiskScanner } from '../../core/DiskScanner.js';
import { DiskEntry } from '../../types/index.js';

const POLL_INTERVAL_MS = 5000;

interface WatchState {
  entries: DiskEntry[];
  newIds: Set<number>;
  removedEntries: DiskEntry[];
  loading: boolean;
}

export function useWatcher(active: boolean) {
  const [state, setState] = useState<WatchState>({
    entries: [],
    newIds: new Set(),
    removedEntries: [],
    loading: true,
  });

  const scannerRef = useRef(new DiskScanner());
  const prevMapRef = useRef(new Map<number, DiskEntry>());
  const prevIdsRef = useRef(new Set<number>());

  const tick = useCallback(async () => {
    const entries = await scannerRef.current.scan(true);
    const currentIds = new Set(entries.map((e) => e.id));

    const newIds = new Set<number>();
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) newIds.add(id);
    }

    const removedEntries: DiskEntry[] = [];
    for (const [id, entry] of prevMapRef.current) {
      if (!currentIds.has(id)) removedEntries.push(entry);
    }

    prevIdsRef.current = currentIds;
    prevMapRef.current = new Map(entries.map((e) => [e.id, e]));

    setState({ entries, newIds, removedEntries, loading: false });
  }, []);

  useEffect(() => {
    if (!active) return;

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [active, tick]);

  return state;
}
