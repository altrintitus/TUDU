import { db, ensureInbox, type List, type Task, type Idea, type Routine, type RoutineDone, type Water } from '../db';

export interface BackupV1 {
  version: 1;
  exportedAt: string;
  lists: List[];
  tasks: Task[];
  ideas: Idea[];
  // Optional so pre-2.0 backups (no routines/water) still import — treated as empty.
  routines?: Routine[];
  routineDone?: RoutineDone[];
  water?: Water[];
}

export async function exportData(): Promise<BackupV1> {
  const [lists, tasks, ideas, routines, routineDone, water] = await Promise.all([
    db.lists.toArray(), db.tasks.toArray(), db.ideas.toArray(),
    db.routines.toArray(), db.routineDone.toArray(), db.water.toArray()
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), lists, tasks, ideas, routines, routineDone, water };
}

function isIdArray(arr: unknown): boolean {
  return Array.isArray(arr) &&
    arr.every((item) => typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string');
}

// water rows are keyed by `date` (no `id`), so validate on that instead.
function isDateArray(arr: unknown): boolean {
  return Array.isArray(arr) &&
    arr.every((item) => typeof item === 'object' && item !== null && typeof (item as { date?: unknown }).date === 'string');
}

export function validateBackup(x: unknown): x is BackupV1 {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  if (b.version !== 1) return false;
  for (const key of ['lists', 'tasks', 'ideas'] as const) {
    if (!isIdArray(b[key])) return false;
  }
  // routines/routineDone optional; if present must be well-formed
  for (const key of ['routines', 'routineDone'] as const) {
    if (b[key] !== undefined && !isIdArray(b[key])) return false;
  }
  if (b.water !== undefined && !isDateArray(b.water)) return false;
  return true;
}

export async function importData(b: BackupV1): Promise<void> {
  await db.transaction('rw', [db.lists, db.tasks, db.ideas, db.routines, db.routineDone, db.water], async () => {
    await Promise.all([db.lists.clear(), db.tasks.clear(), db.ideas.clear(), db.routines.clear(), db.routineDone.clear(), db.water.clear()]);
    await db.lists.bulkAdd(b.lists);
    await db.tasks.bulkAdd(b.tasks);
    await db.ideas.bulkAdd(b.ideas);
    await db.routines.bulkAdd(b.routines ?? []);
    await db.routineDone.bulkAdd(b.routineDone ?? []);
    await db.water.bulkAdd(b.water ?? []);
  });
  await ensureInbox();
}
