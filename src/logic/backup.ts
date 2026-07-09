import { db, ensureInbox, type List, type Task, type Idea } from '../db';

export interface BackupV1 {
  version: 1;
  exportedAt: string;
  lists: List[];
  tasks: Task[];
  ideas: Idea[];
}

export async function exportData(): Promise<BackupV1> {
  const [lists, tasks, ideas] = await Promise.all([
    db.lists.toArray(), db.tasks.toArray(), db.ideas.toArray()
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), lists, tasks, ideas };
}

export function validateBackup(x: unknown): x is BackupV1 {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  if (b.version !== 1) return false;
  for (const key of ['lists', 'tasks', 'ideas'] as const) {
    const arr = b[key];
    if (!Array.isArray(arr)) return false;
    if (!arr.every(item => typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string')) {
      return false;
    }
  }
  return true;
}

export async function importData(b: BackupV1): Promise<void> {
  await db.transaction('rw', db.lists, db.tasks, db.ideas, async () => {
    await db.lists.clear();
    await db.tasks.clear();
    await db.ideas.clear();
    await db.lists.bulkAdd(b.lists);
    await db.tasks.bulkAdd(b.tasks);
    await db.ideas.bulkAdd(b.ideas);
  });
  await ensureInbox();
}
