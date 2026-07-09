// Structural input type: keeps this module free of a db.ts dependency.
// db.Task is assignable to TaskLike.
export interface TaskLike {
  done: boolean;
  dueDate?: string;
  createdAt: number;
}

export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDueOrOverdue(t: TaskLike, today: string): boolean {
  return !t.done && !!t.dueDate && t.dueDate <= today;
}

export function isOverdue(t: TaskLike, today: string): boolean {
  return !t.done && !!t.dueDate && t.dueDate < today;
}

export function compareTodayTasks(a: TaskLike, b: TaskLike, today: string): number {
  const ao = isOverdue(a, today) ? 0 : 1;
  const bo = isOverdue(b, today) ? 0 : 1;
  if (ao !== bo) return ao - bo;
  if (a.dueDate !== b.dueDate) return (a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : 1;
  return a.createdAt - b.createdAt;
}

export function compareListTasks(a: TaskLike, b: TaskLike): number {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
  return a.createdAt - b.createdAt;
}

export function formatDue(due: string, today: string): string {
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < -1) return `${-days}d overdue`;
  return new Date(`${due}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
