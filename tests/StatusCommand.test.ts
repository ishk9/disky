import { describe, it, expect, vi, afterEach } from 'vitest';
import { StatusCommand } from '../src/commands/StatusCommand';
import type { ISystemMetrics, SystemMetrics } from '../src/system/ISystemMetrics';

const SAMPLE: SystemMetrics = {
  collectedAt: '2026-06-09T00:00:00.000Z',
  host: {
    hostname: 'test-host',
    model: 'Mac15,13',
    cpuModel: 'Apple M3',
    osVersion: 'macOS 26',
    uptimeSeconds: 90061,
  },
  cpu: { usage: 0.45, perCore: [0.5, 0.4], load1: 2.1, load5: 1.8, load15: 1.5, coreCount: 2 },
  memory: { totalBytes: 16e9, usedBytes: 8e9, freeBytes: 8e9, usedFraction: 0.5 },
  disk: { totalBytes: 500e9, usedBytes: 300e9, freeBytes: 200e9, usedFraction: 0.6 },
  battery: { level: 0.85, charging: true },
  gpu: { name: 'Apple M3' },
  network: { rxBytesPerSec: 1024, txBytesPerSec: 2048 },
  processes: [{ pid: 123, name: 'node', cpu: 12.5, memBytes: 50e6 }],
  health: { score: 78, message: 'Good' },
};

class FakeMetrics implements ISystemMetrics {
  async collect(): Promise<SystemMetrics> {
    return SAMPLE;
  }
}

function capture(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((c: any) => {
    chunks.push(String(c));
    return true;
  });
  return fn().then(() => {
    spy.mockRestore();
    return chunks.join('');
  });
}

afterEach(() => vi.restoreAllMocks());

describe('StatusCommand', () => {
  it('emits valid JSON with --json', async () => {
    const out = await capture(() => new StatusCommand({ json: true }, new FakeMetrics()).execute());
    const parsed = JSON.parse(out);
    expect(parsed.health.score).toBe(78);
    expect(parsed.cpu.coreCount).toBe(2);
    expect(parsed.host.hostname).toBe('test-host');
  });

  it('renders a human dashboard with key sections', async () => {
    const out = await capture(() =>
      new StatusCommand({ json: false }, new FakeMetrics()).execute(),
    );
    const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
    const plain = out.replace(ansi, '');
    expect(plain).toContain('disky status');
    expect(plain).toContain('78/100');
    expect(plain).toContain('Top processes');
    expect(plain).toContain('node');
  });
});
