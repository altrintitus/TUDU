import { describe, it, expect } from 'vitest';
import { loadGoal, saveGoal, formatL, fillFraction, snap, goalMetDays, DEFAULT_GOAL } from '../src/logic/water';

const fakeStorage = (): Storage => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() { return m.size; }
  } as Storage;
};

describe('goal persistence', () => {
  it('defaults when unset or invalid, round-trips a saved goal', () => {
    const s = fakeStorage();
    expect(loadGoal(s)).toBe(DEFAULT_GOAL);
    saveGoal(3500, s);
    expect(loadGoal(s)).toBe(3500);
    s.setItem('tudu.water.goalMl', 'garbage');
    expect(loadGoal(s)).toBe(DEFAULT_GOAL);
  });
});

describe('formatL', () => {
  it('renders one decimal litre', () => {
    expect(formatL(1500)).toBe('1.5 L');
    expect(formatL(3000)).toBe('3.0 L');
    expect(formatL(0)).toBe('0.0 L');
  });
});

describe('fillFraction', () => {
  it('clamps to 0..1', () => {
    expect(fillFraction(1500, 3000)).toBe(0.5);
    expect(fillFraction(4000, 3000)).toBe(1);
    expect(fillFraction(-100, 3000)).toBe(0);
    expect(fillFraction(500, 0)).toBe(0);
  });
});

describe('snap', () => {
  it('snaps to nearest 250, floors at 0', () => {
    expect(snap(1300)).toBe(1250);
    expect(snap(1375)).toBe(1500);
    expect(snap(-50)).toBe(0);
    expect(snap(130)).toBe(250); // rounds up past the 125 midpoint
    expect(snap(100)).toBe(0);   // rounds down below midpoint
  });
});

describe('goalMetDays', () => {
  const today = '2026-07-11';
  it('counts days in the window that reached the goal', () => {
    const rows = [
      { date: '2026-07-11', ml: 3000 }, // today, met
      { date: '2026-07-10', ml: 2000 }, // in window, not met
      { date: '2026-07-09', ml: 3500 }, // in window, met (over)
      { date: '2026-06-01', ml: 4000 }  // outside 30-day window
    ];
    expect(goalMetDays(rows, 3000, today, 30)).toBe(2);
  });
});
