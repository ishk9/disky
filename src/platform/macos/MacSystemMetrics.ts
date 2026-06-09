import * as os from 'os';
import { execSync } from 'child_process';
import {
  ISystemMetrics,
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  BatteryMetrics,
  GpuMetrics,
  NetworkMetrics,
  ProcessMetric,
  HostInfo,
} from '../../system/ISystemMetrics.js';
import { diskUsage } from '../../system/diskUsage.js';
import { computeHealth } from '../../system/HealthScore.js';

const CPU_SAMPLE_MS = 200;
const NET_SAMPLE_MS = 500;
const TOP_PROCESS_COUNT = 8;

/** Collects macOS system metrics via os.* and lightweight shell probes. */
export class MacSystemMetrics implements ISystemMetrics {
  async collect(): Promise<SystemMetrics> {
    const [cpu, network] = await Promise.all([this.sampleCpu(), this.sampleNetwork()]);
    const memory = this.memory();
    const disk = diskUsage('/') ?? { totalBytes: 0, usedBytes: 0, freeBytes: 0, usedFraction: 0 };
    const health = computeHealth({
      cpuUsage: cpu.usage,
      memUsedFraction: memory.usedFraction,
      diskUsedFraction: disk.usedFraction,
      loadPerCore: cpu.load1 / Math.max(1, cpu.coreCount),
    });

    return {
      collectedAt: new Date().toISOString(),
      host: this.host(),
      cpu,
      memory,
      disk,
      battery: this.battery(),
      gpu: this.gpu(),
      network,
      processes: this.processes(),
      health,
    };
  }

  // ─── CPU ──────────────────────────────────────────────────────────────────

  private cpuSnapshot(): Array<{ idle: number; total: number }> {
    return os.cpus().map((c) => {
      const t = c.times;
      return { idle: t.idle, total: t.user + t.nice + t.sys + t.idle + t.irq };
    });
  }

  private async sampleCpu(): Promise<CpuMetrics> {
    const a = this.cpuSnapshot();
    await sleep(CPU_SAMPLE_MS);
    const b = this.cpuSnapshot();
    const perCore = a.map((s, i) => {
      const idleD = b[i].idle - s.idle;
      const totalD = b[i].total - s.total;
      return totalD > 0 ? clamp01(1 - idleD / totalD) : 0;
    });
    const usage = perCore.length ? perCore.reduce((x, y) => x + y, 0) / perCore.length : 0;
    const [load1, load5, load15] = os.loadavg();
    return { usage, perCore, load1, load5, load15, coreCount: perCore.length };
  }

  // ─── Memory (vm_stat) ───────────────────────────────────────────────────────

  private memory(): MemoryMetrics {
    const totalBytes = os.totalmem();
    let usedBytes = totalBytes - os.freemem();
    try {
      const raw = execSync('vm_stat', { encoding: 'utf8' });
      const pageSize = parseInt(raw.match(/page size of (\d+) bytes/)?.[1] ?? '16384', 10);
      const pages = (re: RegExp) => parseInt(raw.match(re)?.[1] ?? '0', 10);
      const active = pages(/Pages active:\s+(\d+)/);
      const wired = pages(/Pages wired down:\s+(\d+)/);
      const compressed = pages(/Pages occupied by compressor:\s+(\d+)/);
      usedBytes = (active + wired + compressed) * pageSize;
    } catch {
      // fall back to os.freemem-based estimate
    }
    const freeBytes = Math.max(0, totalBytes - usedBytes);
    return {
      totalBytes,
      usedBytes,
      freeBytes,
      usedFraction: totalBytes > 0 ? usedBytes / totalBytes : 0,
    };
  }

  // ─── Battery (pmset) ────────────────────────────────────────────────────────

  private battery(): BatteryMetrics | null {
    try {
      const raw = execSync('pmset -g batt', { encoding: 'utf8' });
      const pct = raw.match(/(\d+)%/);
      if (!pct) return null;
      return {
        level: parseInt(pct[1], 10) / 100,
        charging: /charging|charged/i.test(raw) && !/discharging/i.test(raw),
      };
    } catch {
      return null;
    }
  }

  // ─── GPU ────────────────────────────────────────────────────────────────────

  private gpu(): GpuMetrics | null {
    try {
      const name = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim();
      return name ? { name } : null;
    } catch {
      return null;
    }
  }

  // ─── Network (netstat) ──────────────────────────────────────────────────────

  private netSnapshot(): { rx: number; tx: number } {
    let rx = 0;
    let tx = 0;
    try {
      const raw = execSync('netstat -ibn', { encoding: 'utf8' });
      for (const line of raw.split('\n')) {
        if (!line.includes('<Link#')) continue;
        const cols = line.trim().split(/\s+/);
        if (cols[0] === 'lo0') continue;
        const ib = parseInt(cols[6], 10);
        const ob = parseInt(cols[9], 10);
        if (!isNaN(ib)) rx += ib;
        if (!isNaN(ob)) tx += ob;
      }
    } catch {
      // netstat unavailable
    }
    return { rx, tx };
  }

  private async sampleNetwork(): Promise<NetworkMetrics> {
    const a = this.netSnapshot();
    await sleep(NET_SAMPLE_MS);
    const b = this.netSnapshot();
    const secs = NET_SAMPLE_MS / 1000;
    return {
      rxBytesPerSec: Math.max(0, (b.rx - a.rx) / secs),
      txBytesPerSec: Math.max(0, (b.tx - a.tx) / secs),
    };
  }

  // ─── Processes (ps) ─────────────────────────────────────────────────────────

  private processes(): ProcessMetric[] {
    try {
      const raw = execSync('ps -Aceo pid,pcpu,rss,comm -r', { encoding: 'utf8' });
      const rows = raw.trim().split('\n').slice(1); // drop header
      const procs: ProcessMetric[] = [];
      for (const line of rows) {
        const m = line.trim().match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/);
        if (!m) continue;
        procs.push({
          pid: parseInt(m[1], 10),
          cpu: parseFloat(m[2]),
          memBytes: parseInt(m[3], 10) * 1024,
          name: m[4],
        });
        if (procs.length >= TOP_PROCESS_COUNT) break;
      }
      return procs;
    } catch {
      return [];
    }
  }

  // ─── Host ────────────────────────────────────────────────────────────────────

  private host(): HostInfo {
    return {
      hostname: os.hostname(),
      model: sysctl('hw.model') ?? 'unknown',
      cpuModel: sysctl('machdep.cpu.brand_string') ?? os.cpus()[0]?.model ?? 'unknown',
      osVersion: productVersion(),
      uptimeSeconds: os.uptime(),
    };
  }
}

function sysctl(key: string): string | null {
  try {
    return execSync(`sysctl -n ${key}`, { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

function productVersion(): string {
  try {
    return `macOS ${execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim()}`;
  } catch {
    return os.release();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
