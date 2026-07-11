import { describe, it, expect, beforeEach } from 'vitest';
import {
  db, INBOX_ID, ensureInbox, createList, renameList, deleteList,
  createTask, toggleTask, updateTask, deleteTask, createIdea, updateIdea, deleteIdea
} from '../src/db';
import { todayStr } from '../src/logic/dates';
import { createRoutine, deleteRoutine, setRoutineDone, getRoutineDoneDates } from '../src/db';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureInbox();
});

describe('inbox', () => {
  it('ensureInbox seeds a permanent Inbox once', async () => {
    await ensureInbox(); // idempotent
    const lists = await db.lists.toArray();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({ id: INBOX_ID, name: 'Inbox' });
  });
  it('inbox cannot be renamed or deleted', async () => {
    await expect(renameList(INBOX_ID, 'X')).rejects.toThrow();
    await expect(deleteList(INBOX_ID)).rejects.toThrow();
  });
});

describe('lists', () => {
  it('createList assigns increasing sortOrder', async () => {
    const a = await createList('Work', '💼');
    const b = await createList('Personal');
    expect(b.sortOrder).toBeGreaterThan(a.sortOrder);
    expect(a.emoji).toBe('💼');
  });
  it('deleteList cascades its tasks and ideas, leaves others', async () => {
    const work = await createList('Work');
    await createTask(work.id, 'doomed');
    await createIdea(work.id, 'doomed idea');
    await createTask(INBOX_ID, 'survivor');
    await deleteList(work.id);
    expect(await db.tasks.count()).toBe(1);
    expect(await db.ideas.count()).toBe(0);
    expect((await db.tasks.toArray())[0].title).toBe('survivor');
  });
});

describe('routines', () => {
  it('creates a routine and toggles completion idempotently', async () => {
    const r = await createRoutine('Meditate', [0, 1, 2, 3, 4, 5, 6]);
    expect(r).toMatchObject({ title: 'Meditate', days: [0, 1, 2, 3, 4, 5, 6] });
    await setRoutineDone(r.id, '2026-07-11', true);
    await setRoutineDone(r.id, '2026-07-11', true); // idempotent — no dupes
    expect(await getRoutineDoneDates(r.id)).toEqual(['2026-07-11']);
    await setRoutineDone(r.id, '2026-07-11', false);
    expect(await getRoutineDoneDates(r.id)).toEqual([]);
  });
  it('deleteRoutine removes the routine and its completions', async () => {
    const r = await createRoutine('Workout', [1, 3, 5]);
    await setRoutineDone(r.id, '2026-07-13', true);
    await deleteRoutine(r.id);
    expect(await db.routines.get(r.id)).toBeUndefined();
    expect(await getRoutineDoneDates(r.id)).toEqual([]);
  });
});

describe('tasks', () => {
  it('createTask stores optional dueDate', async () => {
    const t = await createTask(INBOX_ID, 'call bank', '2026-07-09');
    expect(t).toMatchObject({ listId: INBOX_ID, title: 'call bank', done: false, dueDate: '2026-07-09' });
  });
  it('createTask defaults dueDate to today when omitted', async () => {
    const t = await createTask(INBOX_ID, 'no date given');
    expect(t.dueDate).toBe(todayStr());
  });
  it('createTask keeps an explicit dueDate', async () => {
    const t = await createTask(INBOX_ID, 'dated', '2999-01-01');
    expect(t.dueDate).toBe('2999-01-01');
  });
  it('toggleTask flips done and manages doneAt', async () => {
    const t = await createTask(INBOX_ID, 'x');
    await toggleTask(t.id);
    const done = await db.tasks.get(t.id);
    expect(done!.done).toBe(true);
    expect(done!.doneAt).toBeTypeOf('number');
    await toggleTask(t.id);
    const undone = await db.tasks.get(t.id);
    expect(undone!.done).toBe(false);
    expect(undone!.doneAt).toBeUndefined();
  });
  it('updateTask edits title and clears dueDate with null', async () => {
    const t = await createTask(INBOX_ID, 'x', '2026-07-09');
    await updateTask(t.id, { title: 'y', dueDate: null });
    const got = await db.tasks.get(t.id);
    expect(got!.title).toBe('y');
    expect(got!.dueDate).toBeUndefined();
  });
  it('deleteTask removes it', async () => {
    const t = await createTask(INBOX_ID, 'x');
    await deleteTask(t.id);
    expect(await db.tasks.get(t.id)).toBeUndefined();
  });
});

describe('ideas', () => {
  it('updateIdea bumps updatedAt', async () => {
    const i = await createIdea(INBOX_ID, 'v1');
    await new Promise(r => setTimeout(r, 5));
    await updateIdea(i.id, 'v2');
    const got = await db.ideas.get(i.id);
    expect(got!.text).toBe('v2');
    expect(got!.updatedAt).toBeGreaterThan(i.updatedAt);
  });
  it('deleteIdea removes it', async () => {
    const i = await createIdea(INBOX_ID, 'x');
    await deleteIdea(i.id);
    expect(await db.ideas.get(i.id)).toBeUndefined();
  });
});
