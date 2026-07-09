import { describe, it, expect, beforeEach } from 'vitest';
import { db, ensureInbox, createList, createTask, createIdea, INBOX_ID } from '../src/db';
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
