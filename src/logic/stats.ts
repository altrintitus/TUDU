// Pure performance analytics over tasks + routine completions. Local calendar
// dates only (YYYY-MM-DD via todayStr). No db.ts dependency — accepts plain shapes.
import { todayStr } from './dates';

export interface TaskStat { done: boolean; doneAt?: number; dueDate?: string }
export interface DoneRow { date: string }

function addDays(d: string, n: number): string {
  const dt = new Date(`${d}T00:00:00`);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

// completions per local date: each routineDone row + each done task's doneAt date.
export function activityByDay(tasks: TaskStat[], routineDone: DoneRow[]): Map<string, number> {
  const m = new Map<string, number>();
  const bump = (d: string) => m.set(d, (m.get(d) ?? 0) + 1);
  for (const r of routineDone) bump(r.date);
  for (const t of tasks) if (t.done && t.doneAt !== undefined) bump(todayStr(new Date(t.doneAt)));
  return m;
}

// current: consecutive active days ending today (today-empty does NOT break —
// you may not be done yet). best: longest active run anywhere in history.
export function overallStreak(activity: Map<string, number>, today: string): { current: number; best: number } {
  const active = (d: string) => (activity.get(d) ?? 0) > 0;
  let current = 0;
  let d = active(today) ? today : addDays(today, -1);
  while (active(d)) { current++; d = addDays(d, -1); }

  const dates = [...activity.keys()].filter((k) => (activity.get(k) ?? 0) > 0).sort();
  let best = 0, run = 0, prev = '';
  for (const cur of dates) {
    run = prev && addDays(prev, 1) === cur ? run + 1 : 1;
    if (run > best) best = run;
    prev = cur;
  }
  return { current, best: Math.max(best, current) };
}

// N local dates ending today, oldest first, with each day's completion count.
export function activityWindow(activity: Map<string, number>, today: string, days: number): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ date: d, count: activity.get(d) ?? 0 });
  }
  return out;
}

export function heatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
}

export function taskStats(tasks: TaskStat[], today: string): {
  doneToday: number; doneWeek: number; open: number; overdue: number; keepUpRate: number | null;
} {
  const weekAgo = addDays(today, -6);
  let doneToday = 0, doneWeek = 0, open = 0, overdue = 0;
  for (const t of tasks) {
    if (t.done) {
      if (t.doneAt !== undefined) {
        const d = todayStr(new Date(t.doneAt));
        if (d === today) doneToday++;
        if (d >= weekAgo && d <= today) doneWeek++;
      }
    } else {
      open++;
      if (t.dueDate && t.dueDate < today) overdue++;
    }
  }
  const denom = doneWeek + overdue;
  return { doneToday, doneWeek, open, overdue, keepUpRate: denom === 0 ? null : Math.round((doneWeek / denom) * 100) };
}

// all-time completion count (routines + tasks) from the activity map
export function totalCompletions(activity: Map<string, number>): number {
  let n = 0;
  for (const c of activity.values()) n += c;
  return n;
}

// completions in the trailing 7 days vs the 7 before that
export function weekTrend(activity: Map<string, number>, today: string): { thisWeek: number; lastWeek: number } {
  const inRange = (start: string, end: string) => {
    let n = 0;
    for (const [d, c] of activity) if (d >= start && d <= end) n += c;
    return n;
  };
  return {
    thisWeek: inRange(addDays(today, -6), today),
    lastWeek: inRange(addDays(today, -13), addDays(today, -7))
  };
}
