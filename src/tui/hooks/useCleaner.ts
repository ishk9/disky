import { useState, useCallback } from 'react';
import { DiskEntry } from '../../types/index.js';
import { CleanService } from '../../clean/CleanService.js';
import type { RemovalResult } from '../../clean/ICleaner.js';

export type { RemovalResult };

interface CleanState {
  cleaning: boolean;
  results: RemovalResult[];
  currentIndex: number;
}

export function useCleaner() {
  const [state, setState] = useState<CleanState>({
    cleaning: false,
    results: [],
    currentIndex: -1,
  });

  const clean = useCallback(async (entries: DiskEntry[], options: { force?: boolean } = {}) => {
    const service = new CleanService();
    setState({ cleaning: true, results: [], currentIndex: 0 });

    const results: RemovalResult[] = [];
    for (let i = 0; i < entries.length; i++) {
      setState((s) => ({ ...s, currentIndex: i }));
      results.push(service.clean(entries[i], { force: options.force }));
      setState((s) => ({ ...s, results: [...results] }));
    }

    setState({ cleaning: false, results, currentIndex: -1 });
  }, []);

  const reset = useCallback(() => {
    setState({ cleaning: false, results: [], currentIndex: -1 });
  }, []);

  return { ...state, clean, reset };
}
