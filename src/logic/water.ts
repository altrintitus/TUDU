// Pure water-tracker logic. Millilitres internally; litres for display.
import { todayStr } from './dates';

export const GOAL_PRESETS = [2500, 3000, 3500, 4000]; // ml → 2.5 / 3 / 3.5 / 4 L
export const DEFAULT_GOAL = 3000;
export const STEP = 250; // ml per drag / keyboard increment
const GOAL_KEY = 'tudu.water.goalMl';

export function loadGoal(storage: Storage = localStorage): number {
  const raw = Number(storage.getItem(GOAL_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_GOAL;
}

export function saveGoal(ml: number, storage: Storage = localStorage): void {
  storage.setItem(GOAL_KEY, String(ml));
}

// Reactive goal: both the Today and Progress meters (mounted at once in the
// pager) subscribe, so changing the goal on one pane updates the other.
const goalListeners = new Set<() => void>();
export function setWaterGoal(ml: number, storage: Storage = localStorage): void {
  saveGoal(ml, storage);
  goalListeners.forEach((l) => l());
}
export function subscribeWaterGoal(cb: () => void): () => void {
  goalListeners.add(cb);
  return () => { goalListeners.delete(cb); };
}

export function formatL(ml: number): string {
  return `${(ml / 1000).toFixed(1)} L`;
}

export function fillFraction(ml: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(1, ml / goal));
}

// snap a raw ml value to the nearest STEP, never below 0
export function snap(ml: number, step: number = STEP): number {
  return Math.max(0, Math.round(ml / step) * step);
}

function addDays(d: string, n: number): string {
  const dt = new Date(`${d}T00:00:00`);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

// count days in the trailing `window` (ending today) whose intake met the goal
export function goalMetDays(
  rows: { date: string; ml: number }[],
  goal: number,
  today: string,
  window: number
): number {
  const start = addDays(today, -(window - 1));
  let n = 0;
  for (const r of rows) {
    if (r.date >= start && r.date <= today && r.ml >= goal) n++;
  }
  return n;
}
