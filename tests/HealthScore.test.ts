import { describe, it, expect } from 'vitest';
import { computeHealth } from '../src/system/HealthScore';

describe('computeHealth', () => {
  it('scores an idle, empty system near 100', () => {
    const h = computeHealth({
      cpuUsage: 0,
      memUsedFraction: 0,
      diskUsedFraction: 0,
      loadPerCore: 0,
    });
    expect(h.score).toBe(100);
    expect(h.message).toBe('Excellent');
  });

  it('scores a maxed-out system at the floor', () => {
    const h = computeHealth({
      cpuUsage: 1,
      memUsedFraction: 1,
      diskUsedFraction: 1,
      loadPerCore: 2,
    });
    expect(h.score).toBe(1);
    expect(h.message).toContain('Critical');
  });

  it('is monotonic: more CPU pressure lowers the score', () => {
    const base = { memUsedFraction: 0.3, diskUsedFraction: 0.3, loadPerCore: 0.2 };
    const low = computeHealth({ ...base, cpuUsage: 0.1 });
    const high = computeHealth({ ...base, cpuUsage: 0.9 });
    expect(high.score).toBeLessThan(low.score);
  });

  it('clamps out-of-range / NaN inputs', () => {
    const h = computeHealth({
      cpuUsage: 5,
      memUsedFraction: -1,
      diskUsedFraction: NaN,
      loadPerCore: 100,
    });
    expect(h.score).toBeGreaterThanOrEqual(1);
    expect(h.score).toBeLessThanOrEqual(100);
  });

  it('maps score ranges to messages', () => {
    // All-equal headroom h gives composite h → score ~100h.
    const at = (headroom: number) =>
      computeHealth({
        cpuUsage: 1 - headroom,
        memUsedFraction: 1 - headroom,
        diskUsedFraction: 1 - headroom,
        loadPerCore: 1 - headroom,
      }).message;
    expect(at(0.95)).toBe('Excellent');
    expect(at(0.8)).toBe('Good');
    expect(at(0.65)).toBe('Fair');
  });
});
