// Pure routine schedule + streak logic. Local calendar dates only (no timezone
// math beyond local date formatting).

function parse(d: string): Date { return new Date(`${d}T00:00:00`); }
function fmt(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: string, n: number): string {
  const dt = parse(d);
  dt.setDate(dt.getDate() + n);
  return fmt(dt);
}
function weekday(d: string): number { return parse(d).getDay(); } // 0=Sun..6=Sat

export function isScheduledOn(days: number[], date: string): boolean {
  return days.includes(weekday(date));
}

// Consecutive completed scheduled days ending at the latest scheduled day that is
// completed or is today (today-not-done-yet doesn't break the run).
export function streak(days: number[], done: Set<string>, today: string): number {
  if (days.length === 0) return 0;
  let n = 0;
  let d = today;
  for (let i = 0; i < 3660; i++) { // bounded ~10yr walk-back
    if (isScheduledOn(days, d)) {
      if (done.has(d)) n++;
      else if (d === today) { /* in progress: skip, don't break, don't count */ }
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

export type DotState = 'done' | 'missed' | 'off';

// Last 7 calendar days ending today: off (not scheduled), done, or missed.
export function last7(days: number[], done: Set<string>, today: string): DotState[] {
  const out: DotState[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    if (!isScheduledOn(days, d)) out.push('off');
    else out.push(done.has(d) ? 'done' : 'missed');
  }
  return out;
}
