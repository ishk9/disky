import { useEffect, useRef, useState, useCallback } from 'react';
import { MacSystemMetrics } from '../../platform/macos/MacSystemMetrics.js';
import type { ISystemMetrics, SystemMetrics } from '../../system/ISystemMetrics.js';

interface MetricsState {
  loading: boolean;
  data: SystemMetrics | null;
  error: string | null;
}

export function useSystemMetrics(active: boolean, intervalMs = 2000, metrics?: ISystemMetrics) {
  const metricsRef = useRef<ISystemMetrics>(metrics ?? new MacSystemMetrics());
  const [state, setState] = useState<MetricsState>({ loading: true, data: null, error: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await metricsRef.current.collect();
      setState({ loading: false, data, error: null });
    } catch (err) {
      setState({
        loading: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, refresh]);

  return { ...state, refresh };
}
