# Phase 2 — Data layer

**Goal:** Complete, unit-tested persistence + pure logic. Every later phase only calls what this phase exports — these names are the frozen contract.

**Prerequisite:** Phase 1 done (`npm run verify` green).

**Files:**
- Create: `src/db.ts`, `src/logic/dates.ts`, `src/logic/backup.ts`, `src/logic/text.ts`
- Test: `tests/dates.test.ts`, `tests/text.test.ts`, `tests/db.test.ts`, `tests/backup.test.ts`

**Contract summary (exports):**

```ts
// src/db.ts
INBOX_ID; interface List, Task, Idea; db (Dexie instance)
ensureInbox(); createList(name, emoji?); renameList(id, name, emoji?); deleteList(id)
createTask(listId, title, dueDate?); toggleTask(id); updateTask(id, patch); deleteTask(id)
createIdea(listId, text); updateIdea(id, text); deleteIdea(id)
// src/logic/dates.ts
todayStr(now?); isDueOrOverdue(t, today); isOverdue(t, today)
compareTodayTasks(a, b, today); compareListTasks(a, b); formatDue(due, today)
// src/logic/backup.ts
interface BackupV1; exportData(); validateBackup(x); importData(b)
// src/logic/text.ts
firstLine(text)
```

> Design note: `tasks` has **no index on `done`** — IndexedDB keys can't be booleans. Datasets are tiny; filter in JS.

---

### Task 1: Date logic (TDD)

- [x] **Step 1: Write failing tests** — `tests/dates.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  todayStr, isDueOrOverdue, isOverdue, compareTodayTasks, compareListTasks, formatDue,
  type TaskLike
} from '../src/logic/dates';

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
```

- [x] **Step 2: Run to verify FAIL** — `npx vitest run tests/dates.test.ts`
- [x] **Step 3: Implement** — `src/logic/dates.ts`

```ts
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
```

- [x] **Step 4: Run to verify PASS**, then commit: `git add -A && git commit -m "feat(data): date logic"`

### Task 2: Text helper (TDD)

- [x] **Step 1: Failing test** — `tests/text.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { firstLine } from '../src/logic/text';

describe('firstLine', () => {
  it('returns first line trimmed', () => {
    expect(firstLine('Agent eval harness\nmore detail')).toBe('Agent eval harness');
    expect(firstLine('  padded  \nrest')).toBe('padded');
  });
  it('falls back to Untitled for empty/whitespace', () => {
    expect(firstLine('')).toBe('Untitled');
    expect(firstLine('\n\nbody only')).toBe('Untitled');
  });
});
```

- [x] **Step 2: FAIL** → **Step 3: Implement** — `src/logic/text.ts`

```ts
export function firstLine(text: string): string {
  return text.split('\n')[0].trim() || 'Untitled';
}
```

- [x] **Step 4: PASS** → commit: `git commit -am "feat(data): firstLine helper"`

### Task 3: Dexie store + CRUD (TDD)

- [x] **Step 1: Failing tests** — `tests/db.test.ts` (fake-indexeddb already in `tests/setup.ts`)

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db, INBOX_ID, ensureInbox, createList, renameList, deleteList,
  createTask, toggleTask, updateTask, deleteTask, createIdea, updateIdea, deleteIdea
} from '../src/db';

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

describe('tasks', () => {
  it('createTask stores optional dueDate', async () => {
    const t = await createTask(INBOX_ID, 'call bank', '2026-07-09');
    expect(t).toMatchObject({ listId: INBOX_ID, title: 'call bank', done: false, dueDate: '2026-07-09' });
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
```

- [x] **Step 2: FAIL** → **Step 3: Implement** — `src/db.ts`

```ts
import Dexie, { type Table } from 'dexie';

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

class KinDB extends Dexie {
  lists!: Table<List, string>;
  tasks!: Table<Task, string>;
  ideas!: Table<Idea, string>;
  constructor() {
    super('kin');
    this.version(1).stores({
      lists: 'id, sortOrder',
      tasks: 'id, listId, dueDate', // no index on `done`: booleans are not valid IndexedDB keys
      ideas: 'id, listId, updatedAt'
    });
  }
}

export const db = new KinDB();

export async function ensureInbox(): Promise<void> {
  const existing = await db.lists.get(INBOX_ID);
  if (!existing) {
    await db.lists.add({ id: INBOX_ID, name: 'Inbox', emoji: '📥', sortOrder: 0, createdAt: Date.now() });
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
  const task: Task = { id: crypto.randomUUID(), listId, title, done: false, dueDate, createdAt: Date.now() };
  await db.tasks.add(task);
  return task;
}

export async function toggleTask(id: string): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, t.done ? { done: false, doneAt: undefined } : { done: true, doneAt: Date.now() });
}

export async function updateTask(id: string, patch: { title?: string; dueDate?: string | null }): Promise<void> {
  const upd: Partial<Task> = {};
  if (patch.title !== undefined) upd.title = patch.title;
  if (patch.dueDate !== undefined) upd.dueDate = patch.dueDate ?? undefined;
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
```

- [x] **Step 4: PASS** → commit: `git commit -am "feat(data): dexie store, inbox guards, CRUD"`

### Task 4: Backup (TDD)

- [x] **Step 1: Failing tests** — `tests/backup.test.ts`

```ts
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
```

- [x] **Step 2: FAIL** → **Step 3: Implement** — `src/logic/backup.ts`

```ts
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
```

- [x] **Step 4: PASS** → **Step 5: Full verify + commit**

```bash
npm run verify
git add -A && git commit -m "feat(data): backup export/import with validation"
```

**Done when:** all unit tests pass · `npm run verify` green · no UI change (screens still placeholders).
