import { useState, useCallback } from 'react';
import { NavigationState, ViewName } from '../types.js';
import { DiskEntry } from '../../types/index.js';

export function useNavigation() {
  const [stack, setStack] = useState<NavigationState[]>([{ view: 'dashboard' }]);

  const current = stack[stack.length - 1];

  const push = useCallback(
    (view: ViewName, opts?: { selectedEntry?: DiskEntry; scanResults?: DiskEntry[] }) => {
      setStack((s) => [...s, { view, ...opts }]);
    },
    [],
  );

  const pop = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const replace = useCallback(
    (view: ViewName, opts?: { selectedEntry?: DiskEntry; scanResults?: DiskEntry[] }) => {
      setStack((s) => [...s.slice(0, -1), { view, ...opts }]);
    },
    [],
  );

  const goHome = useCallback(() => {
    setStack([{ view: 'dashboard' }]);
  }, []);

  return { current, push, pop, replace, goHome, canGoBack: stack.length > 1 };
}
