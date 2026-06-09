import { HealthResult } from './ISystemMetrics.js';

export interface HealthInputs {
  /** CPU utilization, 0..1. */
  cpuUsage: number;
  /** Memory used fraction, 0..1. */
  memUsedFraction: number;
  /** Disk used fraction, 0..1. */
  diskUsedFraction: number;
  /** 1-minute load average divided by core count, 0..1+ (clamped). */
  loadPerCore: number;
}

const WEIGHTS = { cpu: 0.3, mem: 0.3, disk: 0.25, load: 0.15 };

/**
 * Composite 1–100 system health score. Each pressure dimension contributes a
 * weighted "headroom" term (1 - usage); higher is healthier.
 */
export function computeHealth(inputs: HealthInputs): HealthResult {
  const cpu = 1 - clamp01(inputs.cpuUsage);
  const mem = 1 - clamp01(inputs.memUsedFraction);
  const disk = 1 - clamp01(inputs.diskUsedFraction);
  const load = 1 - clamp01(inputs.loadPerCore);

  const composite =
    WEIGHTS.cpu * cpu + WEIGHTS.mem * mem + WEIGHTS.disk * disk + WEIGHTS.load * load;
  const score = Math.max(1, Math.min(100, Math.round(composite * 100)));
  return { score, message: messageFor(score) };
}

function messageFor(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor: consider closing apps';
  return 'Critical: low headroom';
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
