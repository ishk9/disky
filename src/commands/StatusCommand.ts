import { ICommand } from '../interfaces/ICommand.js';
import { ISystemMetrics, SystemMetrics } from '../system/ISystemMetrics.js';
import { MacSystemMetrics } from '../platform/macos/MacSystemMetrics.js';
import { Colors } from '../renderers/Colors.js';
import { formatBytes } from '../core/format.js';

const BAR_WIDTH = 10;

/**
 * `disky status` — point-in-time system dashboard (CPU/memory/disk/battery/
 * GPU/network/processes + 1–100 health score). Mirrors `mo status`.
 */
export class StatusCommand implements ICommand {
  constructor(
    private readonly options: { json?: boolean } = {},
    private readonly metrics: ISystemMetrics = new MacSystemMetrics(),
  ) {}

  async execute(): Promise<void> {
    const json = this.options.json ?? !process.stdout.isTTY;
    const m = await this.metrics.collect();

    if (json) {
      process.stdout.write(JSON.stringify(m, null, 2) + '\n');
      return;
    }
    process.stdout.write(render(m));
  }
}

function render(m: SystemMetrics): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(
    `  ${Colors.brand('🩺 disky status')}   ` +
      Colors.dim(
        `${m.host.hostname} · ${m.host.osVersion} · up ${formatUptime(m.host.uptimeSeconds)}`,
      ),
  );
  lines.push('');

  lines.push(`  ${label('Health')}${healthText(m.health.score, m.health.message)}`);
  lines.push(
    `  ${label('CPU')}${bar(m.cpu.usage)} ${pct(m.cpu.usage)}   ` +
      Colors.dim(
        `load ${m.cpu.load1.toFixed(1)} ${m.cpu.load5.toFixed(1)} ${m.cpu.load15.toFixed(1)} · ${m.cpu.coreCount} cores`,
      ),
  );
  lines.push(
    `  ${label('Memory')}${bar(m.memory.usedFraction)} ${pct(m.memory.usedFraction)}   ` +
      Colors.dim(`${formatBytes(m.memory.usedBytes)} / ${formatBytes(m.memory.totalBytes)}`),
  );
  lines.push(
    `  ${label('Disk')}${bar(m.disk.usedFraction)} ${pct(m.disk.usedFraction)}   ` +
      Colors.dim(
        `${formatBytes(m.disk.usedBytes)} used · ${Colors.success(formatBytes(m.disk.freeBytes))}${Colors.dim(' free')}`,
      ),
  );
  if (m.battery) {
    lines.push(
      `  ${label('Battery')}${pct(m.battery.level)}  ` +
        Colors.dim(m.battery.charging ? 'charging' : 'on battery'),
    );
  }
  if (m.gpu) {
    lines.push(`  ${label('GPU')}${Colors.dim(m.gpu.name)}`);
  }
  lines.push(
    `  ${label('Network')}${Colors.dim(`↓ ${formatBytes(m.network.rxBytesPerSec)}/s   ↑ ${formatBytes(m.network.txBytesPerSec)}/s`)}`,
  );

  if (m.processes.length > 0) {
    lines.push('');
    lines.push(`  ${Colors.header('Top processes')}`);
    for (const p of m.processes) {
      lines.push(
        `  ${Colors.dim(String(p.pid).padStart(6))}  ${p.name.slice(0, 22).padEnd(22)} ` +
          `${Colors.size(`${p.cpu.toFixed(1)}%`.padStart(6))}  ${Colors.dim(formatBytes(p.memBytes))}`,
      );
    }
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

function label(text: string): string {
  return Colors.dim(text.padEnd(9));
}

function bar(fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(f * BAR_WIDTH);
  const color = f >= 0.85 ? Colors.error : f >= 0.7 ? Colors.size : Colors.success;
  return color('█'.repeat(filled)) + Colors.dim('░'.repeat(BAR_WIDTH - filled));
}

function pct(fraction: number): string {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`.padStart(4);
}

function healthText(score: number, message: string): string {
  const color = score >= 75 ? Colors.success : score >= 60 ? Colors.size : Colors.error;
  return `${color(`${score}/100`)}  ${Colors.dim(message)}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
