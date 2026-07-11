import { describe, it, expect, beforeEach } from 'vitest';
import {
  db, ensureInbox, createList, createTask, createIdea,
  createRoutine, setRoutineDone, getRoutineDoneDates, INBOX_ID
} from '../src/db';
import { exportData, validateBackup, importData } from '../src/logic/backup';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureInbox();
});

it('export → wipe → import restores identical data', async () => {
  const work = await createList('Work', '💼');
  await createTask(work.id, 'report', '2026-07-10');
  await createIdea(INBOX_ID, 'idea\nbody');
  const backup = await exportData();
  expect(backup.version).toBe(1);

  await db.transaction('rw', db.lists, db.tasks, db.ideas, async () => {
    await db.lists.clear(); await db.tasks.clear(); await db.ideas.clear();
  });
  await importData(backup);

  expect((await exportData())).toMatchObject({
    lists: backup.lists, tasks: backup.tasks, ideas: backup.ideas
  });
});

it('export → wipe → import restores routines and streak history', async () => {
  const r = await createRoutine('Meditate', [0, 1, 2, 3, 4, 5, 6]);
  await setRoutineDone(r.id, '2026-07-10', true);
  await setRoutineDone(r.id, '2026-07-11', true);
  const backup = await exportData();
  expect(backup.routines).toHaveLength(1);
  expect(backup.routineDone).toHaveLength(2);

  await db.delete();
  await db.open();
  await importData(backup);

  const routines = await db.routines.toArray();
  expect(routines).toEqual(backup.routines);
  expect(await getRoutineDoneDates(r.id)).toEqual(['2026-07-10', '2026-07-11']);
});

it('importData REPLACES existing routines too', async () => {
  const backup = await exportData(); // no routines
  await createRoutine('doomed routine', [1]);
  await importData(backup);
  expect(await db.routines.count()).toBe(0);
});

it('accepts a pre-2.0 backup with no routine fields', async () => {
  const legacy = { version: 1 as const, exportedAt: 'x', lists: [], tasks: [], ideas: [] };
  expect(validateBackup(legacy)).toBe(true);
  await createRoutine('should be wiped', [1]);
  await importData(legacy);
  expect(await db.routines.count()).toBe(0);
});

it('importData REPLACES existing data', async () => {
  const backup = await exportData(); // inbox only
  await createTask(INBOX_ID, 'extra task after export');
  await importData(backup);
  expect(await db.tasks.count()).toBe(0);
});

it('importData guarantees inbox exists even if backup lacks it', async () => {
  const backup = await exportData();
  backup.lists = backup.lists.filter(l => l.id !== INBOX_ID);
  await importData(backup);
  expect(await db.lists.get(INBOX_ID)).toBeDefined();
});

describe('validateBackup', () => {
  it('accepts a real export', async () => {
    expect(validateBackup(await exportData())).toBe(true);
  });
  it('rejects garbage', () => {
    expect(validateBackup(null)).toBe(false);
    expect(validateBackup({})).toBe(false);
    expect(validateBackup({ version: 2, lists: [], tasks: [], ideas: [] })).toBe(false);
    expect(validateBackup({ version: 1, lists: 'nope', tasks: [], ideas: [] })).toBe(false);
    expect(validateBackup({ version: 1, lists: [{ id: 1 }], tasks: [], ideas: [] })).toBe(false);
  });
});
