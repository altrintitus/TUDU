import { describe, it, expect } from 'vitest';
import { firstLine, relativeTime } from '../src/logic/text';

describe('firstLine', () => {
  it('returns first line trimmed', () => {
    expect(firstLine('Agent eval harness\nmore detail')).toBe('Agent eval harness');
    expect(firstLine('  padded  \nrest')).toBe('padded');
  });
  it('falls back to Untitled for empty/whitespace', () => {
    expect(firstLine('')).toBe('Untitled');
    expect(firstLine('\n\nbody only')).toBe('Untitled');
  });
});

describe('relativeTime', () => {
  const now = 1_700_000_000_000;
  const ago = (ms: number) => relativeTime(now - ms, now);

  it('labels sub-minute as now', () => {
    expect(ago(0)).toBe('now');
    expect(ago(59_000)).toBe('now');
  });
  it('labels minutes, hours, days', () => {
    expect(ago(60_000)).toBe('1m ago');
    expect(ago(59 * 60_000)).toBe('59m ago');
    expect(ago(60 * 60_000)).toBe('1h ago');
    expect(ago(23 * 3_600_000)).toBe('23h ago');
    expect(ago(24 * 3_600_000)).toBe('1d ago');
    expect(ago(6 * 86_400_000)).toBe('6d ago');
  });
  it('falls back to a short date beyond a week', () => {
    expect(ago(7 * 86_400_000)).toMatch(/^[A-Z][a-z]{2} \d+$/);
  });
});
