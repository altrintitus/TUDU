import { describe, it, expect } from 'vitest';
import { activityByDay, overallStreak, activityWindow, heatLevel, taskStats, totalCompletions, weekTrend } from '../src/logic/stats';

// local-noon epoch ms for a YYYY-MM-DD (avoids TZ edge at midnight)
const ms = (d: string) => new Date(`${d}T12:00:00`).getTime();

describe('activityByDay', () => {
  it('counts routine completions + task doneAt per local date', () => {
    const m = activityByDay(
      [
        { done: true, doneAt: ms('2026-07-11') },
        { done: true, doneAt: ms('2026-07-11') },
        { done: false }, // open task ignored
        { done: true } // done but no doneAt ignored
      ],
      [{ date: '2026-07-11' }, { date: '2026-07-10' }]
    );
    expect(m.get('2026-07-11')).toBe(3); // 2 tasks + 1 routine
    expect(m.get('2026-07-10')).toBe(1);
    expect(m.has('2026-07-09')).toBe(false);
  });
});

describe('overallStreak', () => {
  const today = '2026-07-11';
  it('counts consecutive active days ending today', () => {
    const a = new Map([['2026-07-09', 1], ['2026-07-10', 2], ['2026-07-11', 1]]);
    expect(overallStreak(a, today)).toEqual({ current: 3, best: 3 });
  });
  it('empty today does NOT break the run (counts through yesterday)', () => {
    const a = new Map([['2026-07-09', 1], ['2026-07-10', 1]]);
    expect(overallStreak(a, today).current).toBe(2);
  });
  it('a gap before today breaks current but best keeps the longest run', () => {
    const a = new Map([['2026-07-05', 1], ['2026-07-06', 1], ['2026-07-07', 1], ['2026-07-11', 1]]);
    const r = overallStreak(a, today);
    expect(r.current).toBe(1);
    expect(r.best).toBe(3);
  });
  it('all empty → 0/0', () => {
    expect(overallStreak(new Map(), today)).toEqual({ current: 0, best: 0 });
  });
});

describe('activityWindow', () => {
  it('returns N days ending today, oldest first, 0 when no activity', () => {
    const a = new Map([['2026-07-11', 4]]);
    const w = activityWindow(a, '2026-07-11', 3);
    expect(w.map((c) => c.date)).toEqual(['2026-07-09', '2026-07-10', '2026-07-11']);
    expect(w.map((c) => c.count)).toEqual([0, 0, 4]);
  });
});

describe('heatLevel', () => {
  it('buckets 0 / 1-2 / 3-4 / 5+', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('taskStats', () => {
  const today = '2026-07-11';
  it('done today/week from doneAt, overdue from dueDate, keepUpRate', () => {
    const s = taskStats(
      [
        { done: true, doneAt: ms('2026-07-11') },              // today + week
        { done: true, doneAt: ms('2026-07-06') },              // week edge (today-5)
        { done: true, doneAt: ms('2026-07-01') },              // older, out of week
        { done: false, dueDate: '2026-07-09' },                // overdue + open
        { done: false, dueDate: '2026-07-20' }                 // open, future
      ],
      today
    );
    expect(s.doneToday).toBe(1);
    expect(s.doneWeek).toBe(2);
    expect(s.open).toBe(2);
    expect(s.overdue).toBe(1);
    expect(s.keepUpRate).toBe(67); // 2 / (2 + 1) = 66.7 → 67
  });
  it('keepUpRate is null when nothing done this week and nothing overdue', () => {
    expect(taskStats([{ done: false, dueDate: '2026-07-20' }], today).keepUpRate).toBeNull();
  });
});

describe('totalCompletions / weekTrend', () => {
  const today = '2026-07-11';
  const a = new Map([
    ['2026-07-11', 2], ['2026-07-08', 1], // this week [07-05..07-11]
    ['2026-07-03', 3], ['2026-06-30', 1]  // last week [06-28..07-04]
  ]);
  it('total sums all counts', () => {
    expect(totalCompletions(a)).toBe(7);
  });
  it('splits this vs last 7-day window', () => {
    expect(weekTrend(a, today)).toEqual({ thisWeek: 3, lastWeek: 4 });
  });
});
