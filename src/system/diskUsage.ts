import * as fs from 'fs';

export interface DiskUsage {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  /** Fraction used, 0..1. */
  usedFraction: number;
}

/**
 * Volume capacity/free space for the filesystem containing `path`, via
 * `statfs`. Returns null if unavailable. Used for the analyze whole-disk
 * context and the status dashboard.
 */
export function diskUsage(path = '/'): DiskUsage | null {
  try {
    const s = fs.statfsSync(path);
    const totalBytes = s.blocks * s.bsize;
    const freeBytes = s.bavail * s.bsize;
    const usedBytes = totalBytes - freeBytes;
    return {
      totalBytes,
      freeBytes,
      usedBytes,
      usedFraction: totalBytes > 0 ? usedBytes / totalBytes : 0,
    };
  } catch {
    return null;
  }
}
