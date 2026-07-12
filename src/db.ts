import Dexie, { type Table } from 'dexie';
import { todayStr } from './logic/dates';

export const INBOX_ID = 'inbox';

export interface List {
  id: string;
  name: string;
  emoji?: string;
  sortOrder: number;
  createdAt: number;
}
export interface Task {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  doneAt?: number;
  dueDate?: string; // 'YYYY-MM-DD' local calendar date
  createdAt: number;
}
export interface Idea {
  id: string;
  listId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}
// Global recurring habit. `days` = JS weekday indices (0=Sun..6=Sat); [0..6] = daily.
export interface Routine {
  id: string;
  title: string;
  days: number[];
  sortOrder: number;
  createdAt: number;
}
// One completion of a routine on a given local date. id = `${routineId}:${date}`
// makes toggling idempotent and deletion trivial.
export interface RoutineDone {
  id: string;
  routineId: string;
  date: string; // 'YYYY-MM-DD' local
}

class TuduDB extends Dexie {
  lists!: Table<List, string>;
  tasks!: Table<Task, string>;
  ideas!: Table<Idea, string>;
  routines!: Table<Routine, string>;
  routineDone!: Table<RoutineDone, string>;
  constructor() {
    super('tudu');
    this.version(1).stores({
      lists: 'id, sortOrder',
      tasks: 'id, listId, dueDate', // no index on `done`: booleans are not valid IndexedDB keys
      ideas: 'id, listId, updatedAt'
    });
    // v2 adds routines (additive — existing stores unchanged, on-device data preserved)
    this.version(2).stores({
      lists: 'id, sortOrder',
      tasks: 'id, listId, dueDate',
      ideas: 'id, listId, updatedAt',
      routines: 'id, sortOrder',
      routineDone: 'id, routineId, date'
    });
  }
}

export const db = new TuduDB();

export async function ensureInbox(): Promise<void> {
  const existing = await db.lists.get(INBOX_ID);
  if (existing) return;
  try {
    await db.lists.add({ id: INBOX_ID, name: 'Inbox', emoji: '📥', sortOrder: 0, createdAt: Date.now() });
  } catch (e) {
    // Concurrent callers (e.g. React StrictMode's double-invoked mount effect) can
    // both pass the existence check and race to add — the loser throws ConstraintError.
    // Inbox exists either way, so that's success.
    if ((e as { name?: string }).name !== 'ConstraintError') throw e;
  }
}

export async function createList(name: string, emoji?: string): Promise<List> {
  const last = await db.lists.orderBy('sortOrder').last();
  const list: List = {
    id: crypto.randomUUID(), name, emoji,
    sortOrder: (last?.sortOrder ?? 0) + 1, createdAt: Date.now()
  };
  await db.lists.add(list);
  return list;
}

export async function renameList(id: string, name: string, emoji?: string): Promise<void> {
  if (id === INBOX_ID) throw new Error('Inbox cannot be renamed');
  await db.lists.update(id, { name, emoji });
}

export async function deleteList(id: string): Promise<void> {
  if (id === INBOX_ID) throw new Error('Inbox cannot be deleted');
  await db.transaction('rw', db.lists, db.tasks, db.ideas, async () => {
    await db.tasks.where('listId').equals(id).delete();
    await db.ideas.where('listId').equals(id).delete();
    await db.lists.delete(id);
  });
}

export async function createTask(listId: string, title: string, dueDate?: string): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(), listId, title, done: false,
    dueDate: dueDate ?? todayStr(), // default to today so it lands on the Today page
    createdAt: Date.now()
  };
  await db.tasks.add(task);
  return task;
}

export async function toggleTask(id: string): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, t.done ? { done: false, doneAt: undefined } : { done: true, doneAt: Date.now() });
}

export async function updateTask(id: string, patch: { title?: string; dueDate?: string | null; listId?: string }): Promise<void> {
  const upd: Partial<Task> = {};
  if (patch.title !== undefined) upd.title = patch.title;
  if (patch.dueDate !== undefined) upd.dueDate = patch.dueDate ?? undefined;
  if (patch.listId !== undefined) upd.listId = patch.listId;
  await db.tasks.update(id, upd);
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

export async function createIdea(listId: string, text: string): Promise<Idea> {
  const now = Date.now();
  const idea: Idea = { id: crypto.randomUUID(), listId, text, createdAt: now, updatedAt: now };
  await db.ideas.add(idea);
  return idea;
}

export async function updateIdea(id: string, text: string): Promise<void> {
  await db.ideas.update(id, { text, updatedAt: Date.now() });
}

export async function deleteIdea(id: string): Promise<void> {
  await db.ideas.delete(id);
}

// ---- routines ----

export async function createRoutine(title: string, days: number[]): Promise<Routine> {
  const last = await db.routines.orderBy('sortOrder').last();
  const r: Routine = {
    id: crypto.randomUUID(), title, days,
    sortOrder: (last?.sortOrder ?? 0) + 1, createdAt: Date.now()
  };
  await db.routines.add(r);
  return r;
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.transaction('rw', db.routines, db.routineDone, async () => {
    await db.routineDone.where('routineId').equals(id).delete();
    await db.routines.delete(id);
  });
}

export async function setRoutineDone(routineId: string, date: string, done: boolean): Promise<void> {
  const id = `${routineId}:${date}`;
  if (done) await db.routineDone.put({ id, routineId, date });
  else await db.routineDone.delete(id);
}

export async function getRoutineDoneDates(routineId: string): Promise<string[]> {
  const rows = await db.routineDone.where('routineId').equals(routineId).toArray();
  return rows.map((r) => r.date).sort();
}
