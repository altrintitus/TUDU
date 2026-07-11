import { describe, it, expect } from 'vitest';
import { isScheduledOn, streak, last7 } from '../src/logic/routines';

const daily = [0, 1, 2, 3, 4, 5, 6];
const set = (...d: string[]) => new Set(d);

describe('isScheduledOn', () => {
  it('daily is always scheduled', () => {
    expect(isScheduledOn(daily, '2026-07-11')).toBe(true); // Sat
  });
  it('weekday-only excludes the weekend', () => {
    const weekdays = [1, 2, 3, 4, 5];
    expect(isScheduledOn(weekdays, '2026-07-11')).toBe(false); // Sat
    expect(isScheduledOn(weekdays, '2026-07-13')).toBe(true); // Mon
  });
});

describe('streak (daily)', () => {
  const today = '2026-07-11';
  it('counts consecutive completed days ending today', () => {
    expect(streak(daily, set('2026-07-09', '2026-07-10', '2026-07-11'), today)).toBe(3);
  });
  it('today not done yet does NOT break the run', () => {
    expect(streak(daily, set('2026-07-09', '2026-07-10'), today)).toBe(2);
  });
  it('a missed past day breaks it', () => {
    expect(streak(daily, set('2026-07-08', '2026-07-11'), today)).toBe(1);
  });
  it('empty history → 0', () => {
    expect(streak(daily, set(), today)).toBe(0);
  });
});

describe('streak (weekdays skip weekend)', () => {
  it('weekend gap does not break a weekday routine', () => {
    const weekdays = [1, 2, 3, 4, 5];
    // Mon 07-13 today; Fri 07-10 + Mon 07-13 done; Sat/Sun not scheduled → streak 2
    expect(streak(weekdays, set('2026-07-10', '2026-07-13'), '2026-07-13')).toBe(2);
  });
});

describe('last7 (daily)', () => {
  it('marks done/missed across the 7-day window ending today', () => {
    const today = '2026-07-11';
    const done = set('2026-07-11', '2026-07-10', '2026-07-08');
    // window 07-05..07-11 → done on 08, 10, 11
    expect(last7(daily, done, today)).toEqual(['missed', 'missed', 'missed', 'done', 'missed', 'done', 'done']);
  });
  it('non-scheduled days are off', () => {
    const weekdays = [1, 2, 3, 4, 5];
    // window ending Mon 07-13: 07-07(Tue)..07-13(Mon); 07-11 Sat + 07-12 Sun = off
    const dots = last7(weekdays, set(), '2026-07-13');
    expect(dots[4]).toBe('off'); // Sat 07-11
    expect(dots[5]).toBe('off'); // Sun 07-12
    expect(dots[6]).toBe('missed'); // Mon 07-13 scheduled, not done
  });
});
