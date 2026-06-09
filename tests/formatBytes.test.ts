import { describe, it, expect } from 'vitest';
import { formatBytes } from '../src/core/DiskScanner';

describe('formatBytes', () => {
  it('returns bytes for values under 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('returns KB for values under 1 MB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(512 * 1024)).toBe('512 KB');
  });

  it('returns MB for values under 1 GB', () => {
    expect(formatBytes(1024 ** 2)).toBe('1 MB');
    expect(formatBytes(50 * 1024 ** 2)).toBe('50 MB');
    expect(formatBytes(999 * 1024 ** 2)).toBe('999 MB');
  });

  it('returns GB for values at or above 1 GB', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GB');
    expect(formatBytes(10 * 1024 ** 3)).toBe('10.0 GB');
  });

  it('handles boundary between MB and GB', () => {
    // Just under 1 GB
    expect(formatBytes(1024 ** 3 - 1)).toBe('1024 MB');
    // Exactly 1 GB
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
  });
});
