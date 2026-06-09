export interface HostInfo {
  hostname: string;
  /** Hardware model id, e.g. "Mac15,12". */
  model: string;
  cpuModel: string;
  osVersion: string;
  uptimeSeconds: number;
}

export interface CpuMetrics {
  /** Overall utilization, 0..1. */
  usage: number;
  /** Per-core utilization, 0..1. */
  perCore: number[];
  load1: number;
  load5: number;
  load15: number;
  coreCount: number;
}

export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedFraction: number;
}

export interface DiskMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedFraction: number;
}

export interface BatteryMetrics {
  /** Charge level, 0..1. */
  level: number;
  charging: boolean;
}

export interface GpuMetrics {
  name: string;
  coreCount?: number;
}

export interface NetworkMetrics {
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

export interface ProcessMetric {
  pid: number;
  name: string;
  /** CPU percent (may exceed 100 across cores). */
  cpu: number;
  memBytes: number;
}

export interface HealthResult {
  /** 1..100. */
  score: number;
  message: string;
}

export interface SystemMetrics {
  collectedAt: string;
  host: HostInfo;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  battery: BatteryMetrics | null;
  gpu: GpuMetrics | null;
  network: NetworkMetrics;
  processes: ProcessMetric[];
  health: HealthResult;
}

/** Collects a point-in-time snapshot of system metrics. */
export interface ISystemMetrics {
  collect(): Promise<SystemMetrics>;
}
