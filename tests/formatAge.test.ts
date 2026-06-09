import { describe, it, expect } from 'vitest';
import { formatAge } from '../src/core/DiskScanner';

describe('formatAge', () => {
  it('returns dash for zero or negative values', () => {
    expect(formatAge(0)).toBe('–');
    expect(formatAge(-1000)).toBe('–');
  });

  it('returns "just now" for very recent ages', () => {
    expect(formatAge(1)).toBe('just now');
    expect(formatAge(500)).toBe('just now');
    expect(formatAge(59 * 1000)).toBe('just now');
  });

  it('returns minutes for ages under 1 hour', () => {
    expect(formatAge(60 * 1000)).toBe('1m ago');
    expect(formatAge(5 * 60 * 1000)).toBe('5m ago');
    expect(formatAge(59 * 60 * 1000)).toBe('59m ago');
  });

  it('returns hours for ages under 1 day', () => {
    expect(formatAge(60 * 60 * 1000)).toBe('1h ago');
    expect(formatAge(12 * 60 * 60 * 1000)).toBe('12h ago');
    expect(formatAge(23 * 60 * 60 * 1000)).toBe('23h ago');
  });

  it('returns days for ages at or above 1 day', () => {
    expect(formatAge(24 * 60 * 60 * 1000)).toBe('1d ago');
    expect(formatAge(7 * 24 * 60 * 60 * 1000)).toBe('7d ago');
    expect(formatAge(365 * 24 * 60 * 60 * 1000)).toBe('365d ago');
  });

  it('floors partial units', () => {
    // 1.9 minutes should show 1m
    expect(formatAge(1.9 * 60 * 1000)).toBe('1m ago');
    // 2.5 hours should show 2h
    expect(formatAge(2.5 * 60 * 60 * 1000)).toBe('2h ago');
    // 1.5 days should show 1d
    expect(formatAge(1.5 * 24 * 60 * 60 * 1000)).toBe('1d ago');
  });
});
