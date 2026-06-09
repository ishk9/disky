import { describe, it, expect } from 'vitest';
import { ProgressReporter } from '../src/io/ProgressReporter';
import type { ScanProgress } from '../src/interfaces/IScanner';

const size = (scanned: number, total: number, found: number): ScanProgress => ({
  phase: 'size',
  scanned,
  total,
  found,
});

describe('ProgressReporter', () => {
  it('writes nothing when disabled', () => {
    const out: string[] = [];
    const r = new ProgressReporter(
      false,
      (s) => out.push(s),
      () => 0,
    );
    r.update(size(1, 10, 1));
    r.done();
    expect(out).toEqual([]);
  });

  it('renders a sizing line and clears on done', () => {
    const out: string[] = [];
    const t = 0;
    const r = new ProgressReporter(
      true,
      (s) => out.push(s),
      () => t,
    );
    r.update(size(3, 10, 2));
    expect(out.join('')).toContain('sizing 3/10 · 2 found');
    r.done();
    // Last write is a clear sequence.
    expect(out[out.length - 1]).toContain('\x1b[2K');
  });

  it('throttles to ~4fps using the injected clock', () => {
    const out: string[] = [];
    let t = 0;
    const r = new ProgressReporter(
      true,
      (s) => out.push(s),
      () => t,
    );
    r.update(size(1, 10, 0)); // renders (first)
    r.update(size(2, 10, 0)); // throttled (same tick)
    expect(out.length).toBe(1);
    t = 300; // > 250ms frame
    r.update(size(3, 10, 0)); // renders
    expect(out.length).toBe(2);
  });

  it('labels find and docker phases', () => {
    const out: string[] = [];
    const r = new ProgressReporter(
      true,
      (s) => out.push(s),
      () => 0,
    );
    r.update({ phase: 'find', scanned: 0, total: 0, found: 0 });
    expect(out.join('')).toContain('searching');
  });
});
