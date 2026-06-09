import { describe, it, expect } from 'vitest';
import { OutputContext } from '../src/io/OutputContext';

describe('OutputContext', () => {
  it('auto-enables JSON when not a TTY (piped)', () => {
    const ctx = new OutputContext({ isTTY: false });
    expect(ctx.json).toBe(true);
    expect(ctx.human).toBe(false);
    expect(ctx.color).toBe(false);
  });

  it('renders human + color when a TTY', () => {
    const ctx = new OutputContext({ isTTY: true });
    expect(ctx.json).toBe(false);
    expect(ctx.human).toBe(true);
    expect(ctx.color).toBe(true);
  });

  it('honors an explicit --json even on a TTY, disabling color', () => {
    const ctx = new OutputContext({ isTTY: true, json: true });
    expect(ctx.json).toBe(true);
    expect(ctx.color).toBe(false);
  });

  it('honors explicit --no-json (json:false) even when piped', () => {
    const ctx = new OutputContext({ isTTY: false, json: false });
    expect(ctx.json).toBe(false);
  });

  it('carries dryRun and debug flags', () => {
    const ctx = new OutputContext({ isTTY: true, dryRun: true, debug: true });
    expect(ctx.dryRun).toBe(true);
    expect(ctx.debug).toBe(true);
  });
});
