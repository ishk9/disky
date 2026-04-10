import { useState, useCallback } from 'react';
import { execFileSync, execSync } from 'child_process';
import { DiskEntry } from '../../types/index.js';

export interface RemovalResult {
  id: number;
  label: string;
  displayPath: string;
  bytesFreed: number;
  success: boolean;
}

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

  const clean = useCallback(async (entries: DiskEntry[]) => {
    setState({ cleaning: true, results: [], currentIndex: 0 });

    const results: RemovalResult[] = [];
    for (let i = 0; i < entries.length; i++) {
      setState((s) => ({ ...s, currentIndex: i }));
      const entry = entries[i];

      try {
        if (entry.isDockerEntry) {
          execSync('docker system prune -f 2>/dev/null', { stdio: 'pipe' });
        } else {
          execFileSync('rm', ['-rf', entry.absolutePath], { stdio: 'pipe' });
        }
        results.push({
          id: entry.id,
          label: entry.artifactType.label,
          displayPath: entry.displayPath,
          bytesFreed: entry.sizeBytes,
          success: true,
        });
      } catch {
        results.push({
          id: entry.id,
          label: entry.artifactType.label,
          displayPath: entry.displayPath,
          bytesFreed: 0,
          success: false,
        });
      }

      setState((s) => ({ ...s, results: [...results] }));
    }

    setState({ cleaning: false, results, currentIndex: -1 });
  }, []);

  const reset = useCallback(() => {
    setState({ cleaning: false, results: [], currentIndex: -1 });
  }, []);

  return { ...state, clean, reset };
}
