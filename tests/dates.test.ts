import { describe, it, expect } from 'vitest';
import {
  todayStr, isDueOrOverdue, isOverdue, compareTodayTasks, compareListTasks, formatDue,
  taskGroup, type TaskLike
} from '../src/logic/dates';

describe('taskGroup', () => {
  const today = '2026-07-11';
  it('classifies by due date', () => {
    expect(taskGroup({ done: false, dueDate: '2026-07-10', createdAt: 0 }, today)).toBe('overdue');
    expect(taskGroup({ done: false, dueDate: '2026-07-11', createdAt: 0 }, today)).toBe('today');
    expect(taskGroup({ done: false, dueDate: '2026-07-12', createdAt: 0 }, today)).toBe('upcoming');
    expect(taskGroup({ done: false, createdAt: 0 }, today)).toBe('nodate');
  });
});

// dates.ts is deliberately independent of db.ts (created in Task 3) — it accepts
// any TaskLike shape, and db's Task is structurally assignable to it.
type T = TaskLike & { id: string };
const task = (over: Partial<T>): T => ({ id: 'x', done: false, createdAt: 0, ...over });
const TODAY = '2026-07-09';

describe('todayStr', () => {
  it('formats local date as YYYY-MM-DD with padding', () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isDueOrOverdue / isOverdue', () => {
  it('due today is due, not overdue', () => {
    const t = task({ dueDate: TODAY });
    expect(isDueOrOverdue(t, TODAY)).toBe(true);
    expect(isOverdue(t, TODAY)).toBe(false);
  });
  it('due yesterday is overdue', () => {
    const t = task({ dueDate: '2026-07-08' });
    expect(isOverdue(t, TODAY)).toBe(true);
  });
  it('future, undated, and done tasks are excluded', () => {
    expect(isDueOrOverdue(task({ dueDate: '2026-07-10' }), TODAY)).toBe(false);
    expect(isDueOrOverdue(task({}), TODAY)).toBe(false);
    expect(isDueOrOverdue(task({ dueDate: TODAY, done: true }), TODAY)).toBe(false);
  });
});

describe('compareTodayTasks', () => {
  it('sorts overdue first, then dueDate asc, then createdAt asc', () => {
    const a = task({ id: 'a', dueDate: '2026-07-07', createdAt: 5 });
    const b = task({ id: 'b', dueDate: '2026-07-08', createdAt: 1 });
    const c = task({ id: 'c', dueDate: TODAY, createdAt: 9 });
    const d = task({ id: 'd', dueDate: TODAY, createdAt: 2 });
    const sorted = [c, b, d, a].sort((x, y) => compareTodayTasks(x, y, TODAY));
    expect(sorted.map(t => t.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});

describe('compareListTasks', () => {
  it('sorts dueDate asc, undated last, then createdAt', () => {
    const a = task({ id: 'a', dueDate: '2026-07-10', createdAt: 9 });
    const b = task({ id: 'b', createdAt: 1 });
    const c = task({ id: 'c', dueDate: '2026-07-08', createdAt: 5 });
    const d = task({ id: 'd', createdAt: 0 });
    expect([a, b, c, d].sort(compareListTasks).map(t => t.id)).toEqual(['c', 'a', 'd', 'b']);
  });
});

describe('formatDue', () => {
  it('labels relative days', () => {
    expect(formatDue(TODAY, TODAY)).toBe('Today');
    expect(formatDue('2026-07-10', TODAY)).toBe('Tomorrow');
    expect(formatDue('2026-07-08', TODAY)).toBe('Yesterday');
    expect(formatDue('2026-07-05', TODAY)).toBe('4d overdue');
    expect(formatDue('2026-07-20', TODAY)).toBe('Jul 20');
  });
});
