import { describe, it, expect } from 'vitest';
import { parseMinSize } from '../src/commands/ListCommand';

describe('parseMinSize', () => {
  it('parses bytes', () => {
    expect(parseMinSize('1024B')).toBe(1024);
    expect(parseMinSize('0B')).toBe(0);
  });

  it('parses kilobytes', () => {
    expect(parseMinSize('1KB')).toBe(1024);
    expect(parseMinSize('100KB')).toBe(100 * 1024);
  });

  it('parses megabytes', () => {
    expect(parseMinSize('500MB')).toBe(500 * 1024 ** 2);
    expect(parseMinSize('1MB')).toBe(1024 ** 2);
  });

  it('parses gigabytes', () => {
    expect(parseMinSize('1GB')).toBe(1024 ** 3);
    expect(parseMinSize('1.5GB')).toBe(Math.round(1.5 * 1024 ** 3));
  });

  it('parses terabytes', () => {
    expect(parseMinSize('1TB')).toBe(1024 ** 4);
  });

  it('defaults bare numbers to MB', () => {
    expect(parseMinSize('500')).toBe(500 * 1024 ** 2);
    expect(parseMinSize('100')).toBe(100 * 1024 ** 2);
  });

  it('handles decimal values', () => {
    expect(parseMinSize('1.5GB')).toBe(Math.round(1.5 * 1024 ** 3));
    expect(parseMinSize('0.5MB')).toBe(Math.round(0.5 * 1024 ** 2));
  });

  it('is case insensitive', () => {
    expect(parseMinSize('500mb')).toBe(500 * 1024 ** 2);
    expect(parseMinSize('1gb')).toBe(1024 ** 3);
    expect(parseMinSize('100kb')).toBe(100 * 1024);
  });

  it('trims whitespace', () => {
    expect(parseMinSize('  500MB  ')).toBe(500 * 1024 ** 2);
  });

  it('allows space between number and unit', () => {
    expect(parseMinSize('500 MB')).toBe(500 * 1024 ** 2);
  });

  it('returns NaN for invalid input', () => {
    expect(parseMinSize('')).toBeNaN();
    expect(parseMinSize('abc')).toBeNaN();
    expect(parseMinSize('MB')).toBeNaN();
    expect(parseMinSize('--500MB')).toBeNaN();
  });
});
