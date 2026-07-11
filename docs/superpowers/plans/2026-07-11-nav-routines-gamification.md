# TUDU 2.0 — 3-page nav · routines · gamification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape TUDU into a 3-page swipe app (Today · Spaces · Ideas), add global routines with per-routine streaks, and rename user-facing "List" → "Space".

**Architecture:** A CSS scroll-snap horizontal pager becomes the `home` route with three full-width panes + a 3-dot indicator. Space detail and idea editor stay as pushed hash routes over the pager. Routines are a new global entity (`routines` + `routineDone` Dexie stores) with pure streak logic in `src/logic/routines.ts`. Tasks default to due=today. The rename is UI-copy-only; the Dexie `lists` store/`List` type are unchanged so on-device data survives.

**Tech Stack:** Vite · React · TypeScript · Dexie + dexie-react-hooks · Vitest · Playwright. Spec: `docs/superpowers/specs/2026-07-11-nav-routines-gamification-design.md`.

**Contract reminders:** `npm run verify` (tsc → eslint → vitest → playwright) must be green at the end of each Phase. Dispatch the `reviewer` agent on the diff before each phase commit. Existing e2e files must stay green (update selectors as noted).

---

## File map

- Create: `src/components/Pager.tsx` (scroll-snap pager + dots)
- Create: `src/screens/TodayScreen.tsx`, `src/screens/SpacesScreen.tsx`, `src/screens/IdeasScreen.tsx`
- Create: `src/components/RoutineRow.tsx`, `src/components/RoutineEditorSheet.tsx`, `src/components/TaskListRow.tsx` (task row w/ space label + group)
- Create: `src/logic/routines.ts` (+ `tests/routines.test.ts`)
- Modify: `src/db.ts` (routines/routineDone stores + CRUD; `createTask` default due), `src/App.tsx` (home → Pager), `src/screens/HomeScreen.tsx` → becomes `SpacesScreen.tsx` content, `src/components/ListCard.tsx`/`ListEditorSheet.tsx`/`ListScreen.tsx` (copy: List→Space), `src/styles.css`
- Tests: `e2e/nav.spec.ts` (new), update `e2e/lists.spec.ts` → `e2e/spaces.spec.ts`, adjust `e2e/smoke.spec.ts`, `e2e/list-view.spec.ts`, `e2e/capture.spec.ts`.

---

## Phase 1 — Pager shell + List→Space rename

**Goal:** Home route renders a 3-pane scroll-snap pager (Today placeholder · Spaces = old home · Ideas placeholder) with a 3-dot indicator. All "List" UI copy becomes "Space". Existing behaviors preserved.

### Task 1.1: Pager component

**Files:**
- Create: `src/components/Pager.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement `Pager.tsx`**

```tsx
import { useRef, useState, type ReactNode } from 'react';

// Horizontal scroll-snap pager. Children = ordered panes; `labels` names them
// for the dot indicator's aria. Active dot derives from scroll position.
export function Pager({ panes, initial = 0 }: {
  panes: { key: string; node: ReactNode }[];
  initial?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initial);

  // Land on the initial pane once, before paint.
  const seeded = useRef(false);
  const onTrackRef = (el: HTMLDivElement | null) => {
    trackRef.current = el;
    if (el && !seeded.current) {
      seeded.current = true;
      el.scrollLeft = initial * el.clientWidth;
    }
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="pager">
      <div className="pager-track" ref={onTrackRef} onScroll={onScroll}>
        {panes.map((p) => (
          <section className="pager-pane" key={p.key}>{p.node}</section>
        ))}
      </div>
      <div className="pager-dots" role="tablist" aria-label="Pages">
        {panes.map((p, i) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={i === active}
            aria-label={p.key}
            className={i === active ? 'pager-dot active' : 'pager-dot'}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add pager CSS** (append to `src/styles.css`)

```css
/* ---- pager ---- */
.pager { position: relative; height: 100dvh; }
.pager-track {
  display: flex;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.pager-track::-webkit-scrollbar { display: none; }
.pager-pane {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
.pager-dots {
  position: fixed;
  top: calc(env(safe-area-inset-top) + var(--space-3));
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  gap: 7px;
}
.pager-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--border-strong);
  transition: background 0.2s, transform 0.2s;
}
.pager-dot.active { background: var(--accent); transform: scale(1.25); }
```

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit` — Expected: PASS (no consumers yet is fine; component compiles).

- [ ] **Step 4: Commit**

```bash
git add src/components/Pager.tsx src/styles.css
git commit -m "feat(nav): scroll-snap Pager component with dot indicator"
```

### Task 1.2: Split HomeScreen → SpacesScreen, wire Pager into App

**Files:**
- Create: `src/screens/SpacesScreen.tsx` (old Home content, minus TodayStrip; "Spaces" heading), `src/screens/TodayScreen.tsx` + `src/screens/IdeasScreen.tsx` (placeholders this phase)
- Modify: `src/App.tsx`, delete `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Create `SpacesScreen.tsx`** — copy current `HomeScreen.tsx` body, with these changes: remove `<TodayStrip/>` and its import; change the wordmark `<h1>` header to a `"Spaces"` title while keeping the settings gear; keep the `visibleLists` Inbox logic; keep FAB + CaptureSheet + ListEditorSheet.

```tsx
// header block replaces the old wordmark header:
<header className="screen-header spaces-header">
  <h1 className="screen-title">Spaces</h1>
  <button className="icon-btn" aria-label="settings" onClick={() => navigate({ name: 'settings' })}>
    {/* keep the existing gear svg from HomeScreen */}
  </button>
</header>
```
Keep the rest (lists section, `+ New space` — rename the button label from `+ New list` to `+ New space`), FAB, sheets. Component name `SpacesScreen`, exported.

- [ ] **Step 2: Create placeholder `TodayScreen.tsx` and `IdeasScreen.tsx`**

```tsx
export function TodayScreen() {
  return (
    <div className="today-screen">
      <header className="screen-header"><h1 className="screen-title">Today</h1></header>
      <p className="empty-hint">Today — coming in phase 2</p>
    </div>
  );
}
```
```tsx
export function IdeasScreen() {
  return (
    <div className="ideas-screen">
      <header className="screen-header"><h1 className="screen-title">Ideas</h1></header>
      <p className="empty-hint">Ideas — coming in phase 4</p>
    </div>
  );
}
```

- [ ] **Step 3: Wire Pager into App** — in `src/App.tsx`, replace the `home` branch:

```tsx
import { Pager } from './components/Pager';
import { TodayScreen } from './screens/TodayScreen';
import { SpacesScreen } from './screens/SpacesScreen';
import { IdeasScreen } from './screens/IdeasScreen';
// ...
{route.name === 'home' && (
  <Pager
    initial={0}
    panes={[
      { key: 'Today', node: <TodayScreen /> },
      { key: 'Spaces', node: <SpacesScreen /> },
      { key: 'Ideas', node: <IdeasScreen /> }
    ]}
  />
)}
```
Remove the `HomeScreen` import and delete `src/screens/HomeScreen.tsx`.

- [ ] **Step 4: Run app, verify manually** — Run: `npm run dev`, open in browser: pager shows Today, swipe/scroll to Spaces (old home content, "Spaces" title, "+ New space"), then Ideas. Dots track. Expected: all three panes render; Spaces retains list cards + FAB + settings gear.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ src/App.tsx
git commit -m "feat(nav): 3-pane pager home (Today/Spaces/Ideas); Spaces = old home"
```

### Task 1.3: Rename List → Space in UI copy

**Files:** Modify `src/components/ListCard.tsx`, `src/components/ListEditorSheet.tsx`, `src/screens/ListScreen.tsx`

- [ ] **Step 1: Update copy strings** (behavior unchanged; types/props/`lists` store stay):
  - `ListEditorSheet.tsx`: sheet titles `'New list'`→`'New space'`, `'Edit list'`→`'Edit space'`; placeholder `'List name'`→`'Space name'`; delete-confirm text keeps counts but wording `delete {name} & …`.
  - `ListCard.tsx`: `aria-label={`edit ${list.name}`}` → keep (still fine).
  - `ListScreen.tsx`: no visible "list" copy (header shows space name); the per-space add button aria stays `add to <name>`.
  - `SpacesScreen.tsx`: `+ New space` (done in 1.2).

- [ ] **Step 2: Grep for residual UI "list" copy** — Run: `grep -rniE "new list|list name|edit list|new idea list" src/` — Expected: no matches.

- [ ] **Step 3: Typecheck + lint** — Run: `npx tsc --noEmit && npx eslint src` — Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "refactor(ui): rename user-facing List → Space (copy only)"
```

### Task 1.4: Update e2e for the pager home + Space copy

**Files:** Modify `e2e/smoke.spec.ts`, rename `e2e/lists.spec.ts`→`e2e/spaces.spec.ts`, adjust `e2e/list-view.spec.ts`, `e2e/capture.spec.ts`; Create `e2e/nav.spec.ts`

- [ ] **Step 1: `e2e/nav.spec.ts`** — verify the three panes exist and dots work:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(dbs.map(d => new Promise(res => {
      const req = indexedDB.deleteDatabase(d.name!);
      req.onsuccess = req.onerror = req.onblocked = () => res(null);
    })));
  });
  await page.reload();
});

test('three pages present; dots select', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spaces' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ideas' })).toBeVisible();
  // tap the Spaces dot → its pane scrolls into view (heading centered/visible)
  await page.getByRole('tab', { name: 'Spaces' }).click();
  await expect(page.getByRole('button', { name: /new space/i })).toBeVisible();
});
```
Note: all three headings are in the DOM simultaneously (panes side by side); `toBeVisible` passes for on-screen panes. If webkit reports off-screen panes as visible too, that's fine for this assertion.

- [ ] **Step 2: Update `smoke.spec.ts`** — `'app shell loads with header'`: assert `getByRole('heading', { name: 'Today' })` (landing) instead of the wordmark. The hash-route test already uses `New list`→ change to `/new space/i` after tapping the Spaces dot first:

```ts
test('app shell loads with header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});
```
For the hash-route test, replace `New list` home indicator with tapping the Spaces dot then asserting `/new space/i`, and keep the settings navigation assertion.

- [ ] **Step 3: Rename `lists.spec.ts` → `spaces.spec.ts`**; in every test, before interacting with space cards / `New space`, first `await page.getByRole('tab', { name: 'Spaces' }).click();` (switch to the Spaces pane). Change copy matchers: `/new list/i`→`/new space/i`. The Inbox-hidden assertions stay.

```bash
git mv e2e/lists.spec.ts e2e/spaces.spec.ts
```

- [ ] **Step 4: Update `list-view.spec.ts` + `capture.spec.ts`** — these open a space/capture. `list-view` beforeEach already navigates by hash (`#/list/inbox`) — keep. `capture.spec` uses the FAB on the pager: the FAB lives on the Spaces pane now, so its capture tests must first click the Spaces dot. Add `await page.getByRole('tab', { name: 'Spaces' }).click();` before opening capture. The Today-strip assertions in capture.spec ('appears in Today strip') move to phase 2 — for now, change them to assert the task exists in its space (open `#/list/inbox`) OR mark those specific assertions skipped with a `// TODO phase 2` and re-enable in Phase 2. Prefer: assert via `#/list/inbox` that the task is present.

- [ ] **Step 5: Run e2e** — Run: `npx playwright test` — Expected: all green. Fix selectors until green.

- [ ] **Step 6: Reviewer + verify + commit**

```bash
# dispatch reviewer agent on the diff, fix findings
npm run verify   # all green
git add e2e/
git commit -m "test(nav): pager e2e; migrate lists→spaces specs"
```

**Phase 1 done when:** `npm run verify` green; manual: swipe between 3 panes, Spaces = full old home with "Space" copy.

---

## Phase 2 — Today page: tasks

**Goal:** Today page shows all open one-off tasks across spaces, grouped Overdue/Today/Upcoming/No-date, each with its space label; new tasks default to due=today. Retire the standalone TodayStrip.

### Task 2.1: `createTask` defaults due=today

**Files:** Modify `src/db.ts`, Test `tests/db.test.ts`

- [ ] **Step 1: Failing test** (append to `tests/db.test.ts`):

```ts
import { todayStr } from '../src/logic/dates';
it('createTask defaults dueDate to today when omitted', async () => {
  const t = await createTask('inbox', 'no date given');
  expect(t.dueDate).toBe(todayStr());
});
it('createTask keeps an explicit dueDate', async () => {
  const t = await createTask('inbox', 'dated', '2999-01-01');
  expect(t.dueDate).toBe('2999-01-01');
});
```

- [ ] **Step 2: Run → fail** — Run: `npx vitest run tests/db.test.ts` — Expected: FAIL (dueDate undefined).

- [ ] **Step 3: Implement** — in `src/db.ts` `createTask`:

```ts
export async function createTask(listId: string, title: string, dueDate?: string): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(), listId, title, done: false,
    dueDate: dueDate ?? todayStr(),   // default to today so it lands on Today
    createdAt: Date.now()
  };
  await db.tasks.add(task);
  return task;
}
```
Add `import { todayStr } from './logic/dates';` at top of `db.ts`.

- [ ] **Step 4: Run → pass** — Run: `npx vitest run tests/db.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db.ts tests/db.test.ts
git commit -m "feat(tasks): default new task due date to today"
```

> ⚠️ This changes capture.spec / list-view expectations (tasks now always dated). Re-run `npx playwright test` after; fix any assertion that assumed undated tasks. Commit fixes.

### Task 2.2: Today tasks grouping logic

**Files:** Modify `src/logic/dates.ts`, Test `tests/dates.test.ts`

- [ ] **Step 1: Failing test** (append to `tests/dates.test.ts`):

```ts
import { taskGroup } from '../src/logic/dates';
describe('taskGroup', () => {
  const today = '2026-07-11';
  it('classifies by due date', () => {
    expect(taskGroup({ done: false, dueDate: '2026-07-10', createdAt: 0 }, today)).toBe('overdue');
    expect(taskGroup({ done: false, dueDate: '2026-07-11', createdAt: 0 }, today)).toBe('today');
    expect(taskGroup({ done: false, dueDate: '2026-07-12', createdAt: 0 }, today)).toBe('upcoming');
    expect(taskGroup({ done: false, createdAt: 0 }, today)).toBe('nodate');
  });
});
```

- [ ] **Step 2: Run → fail** — Run: `npx vitest run tests/dates.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** in `src/logic/dates.ts`:

```ts
export type TaskGroupKey = 'overdue' | 'today' | 'upcoming' | 'nodate';
export function taskGroup(t: TaskLike, today: string): TaskGroupKey {
  if (!t.dueDate) return 'nodate';
  if (t.dueDate < today) return 'overdue';
  if (t.dueDate === today) return 'today';
  return 'upcoming';
}
```

- [ ] **Step 4: Run → pass** — Run: `npx vitest run tests/dates.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/dates.ts tests/dates.test.ts
git commit -m "feat(today): taskGroup classifier for Today grouping"
```

### Task 2.3: TaskListRow + TodayScreen tasks section

**Files:** Create `src/components/TaskListRow.tsx`; Modify `src/screens/TodayScreen.tsx`, `src/styles.css`

- [ ] **Step 1: `TaskListRow.tsx`** — like `TaskRow` but shows the space label and a due chip; reuses `useLongPress`, `firedRef`-guard (copy from `TaskRow`), same checkbox markup.

```tsx
import { useRef } from 'react';
import type { Task } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { isOverdue, formatDue, todayStr } from '../logic/dates';

export function TaskListRow({ task, spaceName, onToggle, onEdit, onDelete }: {
  task: Task; spaceName: string;
  onToggle(): void; onEdit(): void; onDelete(): void;
}) {
  const fired = useRef(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const onClick = () => { if (fired.current) { fired.current = false; return; } onEdit(); };
  const today = todayStr();
  const overdue = isOverdue(task, today);
  return (
    <div className={overdue ? 'task-row overdue' : 'task-row'} {...longPress}
         onPointerDownCapture={() => { fired.current = false; }}>
      <input type="checkbox" aria-label={task.title} checked={task.done}
             onChange={onToggle} onClick={(e) => e.stopPropagation()} />
      <button className="task-main" onClick={onClick}>
        <span className="task-title">{task.title}</span>
        {task.dueDate && <span className={overdue ? 'task-due overdue' : 'task-due'}>{formatDue(task.dueDate, today)}</span>}
        <span className="task-space">{spaceName}</span>
      </button>
    </div>
  );
}
```
Add `.task-space { font-size: 12px; color: var(--muted); white-space: nowrap; }` to CSS.

- [ ] **Step 2: TodayScreen tasks section** — replace placeholder. Query all tasks + lists; group; render sections. Include TaskEditSheet + delete confirm (copy the `pending`/`Sheet` pattern from `ListScreen`). FAB `+` opens CaptureSheet (no fixedListId, default type task).

```tsx
// data:
const data = useLiveQuery(async () => {
  const [tasks, lists] = await Promise.all([db.tasks.toArray(), db.lists.toArray()]);
  const names = new Map(lists.map((l) => [l.id, l.name]));
  const open = tasks.filter((t) => !t.done);
  return { open, names };
});
// grouping:
const today = todayStr();
const groups: { key: TaskGroupKey; label: string }[] = [
  { key: 'overdue', label: 'Overdue' }, { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' }, { key: 'nodate', label: 'No date' }
];
const byGroup = (k: TaskGroupKey) =>
  (data?.open ?? []).filter((t) => taskGroup(t, today) === k)
    .sort((a, b) => (a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : (a.dueDate ?? '') > (b.dueDate ?? '') ? 1 : a.createdAt - b.createdAt);
```
Render each non-empty group with a `.section-label` header and `TaskListRow`s (`spaceName={data.names.get(t.listId) ?? ''}`). Wire `onToggle=toggleTask`, `onEdit`→TaskEditSheet, `onDelete`→confirm Sheet.

- [ ] **Step 3: Manual check** — Run `npm run dev`; seed a couple tasks (different due dates); Today shows them grouped with space labels; check one → it leaves Today. Overdue styled danger.

- [ ] **Step 4: Retire TodayStrip** — remove `<TodayStrip/>` usage (already out of SpacesScreen); delete `src/components/TodayStrip.tsx` only if no other importer (grep first). Keep `dates.ts` today helpers.

- [ ] **Step 5: Reviewer + verify + commit**

```bash
npm run verify
git add src/ && git commit -m "feat(today): all-tasks grouped view with space labels"
```

**Phase 2 done when:** Today lists every open task grouped with space labels; new tasks default to today; verify green.

---

## Phase 3 — Routines + streaks

**Goal:** Global routines with per-routine 🔥 streak + 7-day dots on the Today page; create/complete routines.

### Task 3.1: Routine data model + CRUD

**Files:** Modify `src/db.ts`, Test `tests/db.test.ts`

- [ ] **Step 1: Failing test** (append to `tests/db.test.ts`):

```ts
import { createRoutine, setRoutineDone, getRoutineDoneDates } from '../src/db';
it('creates a routine and toggles completion idempotently', async () => {
  const r = await createRoutine('Meditate', [0,1,2,3,4,5,6]);
  await setRoutineDone(r.id, '2026-07-11', true);
  await setRoutineDone(r.id, '2026-07-11', true); // idempotent
  expect(await getRoutineDoneDates(r.id)).toEqual(['2026-07-11']);
  await setRoutineDone(r.id, '2026-07-11', false);
  expect(await getRoutineDoneDates(r.id)).toEqual([]);
});
```

- [ ] **Step 2: Run → fail** — `npx vitest run tests/db.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** — in `src/db.ts` add interfaces, bump Dexie version (additive), CRUD:

```ts
export interface Routine { id: string; title: string; days: number[]; sortOrder: number; createdAt: number; }
export interface RoutineDone { id: string; routineId: string; date: string; }

// in TuduDB class:
routines!: Table<Routine, string>;
routineDone!: Table<RoutineDone, string>;
// bump version:
this.version(2).stores({
  lists: 'id, sortOrder',
  tasks: 'id, listId, dueDate',
  ideas: 'id, listId, updatedAt',
  routines: 'id, sortOrder',
  routineDone: 'id, routineId, date'
});

export async function createRoutine(title: string, days: number[]): Promise<Routine> {
  const last = await db.routines.orderBy('sortOrder').last();
  const r: Routine = { id: crypto.randomUUID(), title, days, sortOrder: (last?.sortOrder ?? 0) + 1, createdAt: Date.now() };
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
```

- [ ] **Step 4: Run → pass** — `npx vitest run tests/db.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db.ts tests/db.test.ts
git commit -m "feat(routines): routines + routineDone stores and CRUD"
```

### Task 3.2: Routine streak logic (TDD)

**Files:** Create `src/logic/routines.ts`, Test `tests/routines.test.ts`

- [ ] **Step 1: Failing tests** — `tests/routines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isScheduledOn, streak, last7 } from '../src/logic/routines';

const daily = [0,1,2,3,4,5,6];
const set = (...d: string[]) => new Set(d);

describe('isScheduledOn', () => {
  it('daily is always scheduled', () => {
    expect(isScheduledOn(daily, '2026-07-11')).toBe(true); // Sat
  });
  it('weekday-only excludes weekend', () => {
    const weekdays = [1,2,3,4,5];
    expect(isScheduledOn(weekdays, '2026-07-11')).toBe(false); // Sat
    expect(isScheduledOn(weekdays, '2026-07-13')).toBe(true);  // Mon
  });
});

describe('streak (daily)', () => {
  const today = '2026-07-11';
  it('counts consecutive completed days ending today', () => {
    expect(streak(daily, set('2026-07-09','2026-07-10','2026-07-11'), today)).toBe(3);
  });
  it('today not done yet does NOT break the run', () => {
    expect(streak(daily, set('2026-07-09','2026-07-10'), today)).toBe(2);
  });
  it('a missed past day breaks it', () => {
    expect(streak(daily, set('2026-07-08','2026-07-11'), today)).toBe(1);
  });
  it('empty history → 0', () => {
    expect(streak(daily, set(), today)).toBe(0);
  });
});

describe('last7 (daily)', () => {
  it('marks done/missed across the 7-day window ending today', () => {
    const today = '2026-07-11';
    const done = set('2026-07-11','2026-07-10','2026-07-08');
    // 07-05..07-11
    expect(last7(daily, done, today)).toEqual(['missed','missed','done','missed','missed','done','done']);
  });
});
```

- [ ] **Step 2: Run → fail** — `npx vitest run tests/routines.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/logic/routines.ts`**

```ts
// Local calendar-date helpers (no timezone math beyond local dates).
function parse(d: string): Date { return new Date(`${d}T00:00:00`); }
function fmt(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: string, n: number): string {
  const dt = parse(d); dt.setDate(dt.getDate() + n); return fmt(dt);
}
function weekday(d: string): number { return parse(d).getDay(); } // 0=Sun..6=Sat

export function isScheduledOn(days: number[], date: string): boolean {
  return days.includes(weekday(date));
}

// Consecutive completed scheduled days ending at the latest scheduled day that is
// completed or is today (today-not-done doesn't break the run).
export function streak(days: number[], done: Set<string>, today: string): number {
  let n = 0;
  let d = today;
  // walk back up to a bounded window
  for (let i = 0; i < 3660; i++) {
    if (isScheduledOn(days, d)) {
      if (done.has(d)) n++;
      else if (d === today) { /* in progress: skip, don't break */ }
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

export type DotState = 'done' | 'missed' | 'off';
export function last7(days: number[], done: Set<string>, today: string): DotState[] {
  const out: DotState[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    if (!isScheduledOn(days, d)) out.push('off');
    else out.push(done.has(d) ? 'done' : 'missed');
  }
  return out;
}
```

- [ ] **Step 4: Run → pass** — `npx vitest run tests/routines.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/routines.ts tests/routines.test.ts
git commit -m "feat(routines): streak + 7-day dot logic (unit-tested)"
```

### Task 3.3: RoutineRow + RoutineEditorSheet + Today Routines section

**Files:** Create `src/components/RoutineRow.tsx`, `src/components/RoutineEditorSheet.tsx`; Modify `src/screens/TodayScreen.tsx`, `src/styles.css`

- [ ] **Step 1: `RoutineRow.tsx`**

```tsx
import { useRef } from 'react';
import type { Routine } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { streak, last7 } from '../logic/routines';

export function RoutineRow({ routine, doneDates, today, checked, onToggle, onDelete }: {
  routine: Routine; doneDates: Set<string>; today: string;
  checked: boolean; onToggle(): void; onDelete(): void;
}) {
  const fired = useRef(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const s = streak(routine.days, doneDates, today);
  const dots = last7(routine.days, doneDates, today);
  return (
    <div className="routine-row" {...longPress} onPointerDownCapture={() => { fired.current = false; }}>
      <input type="checkbox" aria-label={routine.title} checked={checked} onChange={onToggle} />
      <div className="routine-main">
        <div className="routine-top">
          <span className="routine-title">{routine.title}</span>
          <span className="routine-streak">🔥 {s}</span>
        </div>
        <div className="routine-dots" aria-hidden="true">
          {dots.map((d, i) => <span key={i} className={`rdot ${d}`} />)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `RoutineEditorSheet.tsx`** — new routine: title input (readonly-until-focus for autofill, per existing pattern) + weekday chips (default all selected) + Daily/Weekdays presets + Save.

```tsx
import { useState } from 'react';
import { Sheet } from './Sheet';
import { createRoutine } from '../db';

const LABELS = ['S','M','T','W','T','F','S']; // index = JS getDay
export function RoutineEditorSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const [title, setTitle] = useState('');
  const [ro, setRo] = useState(true);
  const [days, setDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const toggleDay = (d: number) =>
    setDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort());
  const save = async () => {
    const t = title.trim();
    if (!t || days.length === 0) return;
    await createRoutine(t, days);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="New routine">
      <label className="field">
        <span className="field-label">Name</span>
        <input aria-label="Name" value={title} readOnly={ro} onFocus={() => setRo(false)}
               autoComplete="off" autoCorrect="off" placeholder="Meditate"
               onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field">
        <span className="field-label">Repeat on</span>
        <div className="daychips" role="group" aria-label="Repeat days">
          {LABELS.map((l, d) => (
            <button key={d} aria-pressed={days.includes(d)} aria-label={`day ${d}`}
                    className={days.includes(d) ? 'daychip on' : 'daychip'}
                    onClick={() => toggleDay(d)}>{l}</button>
          ))}
        </div>
        <div className="presets">
          <button onClick={() => setDays([0,1,2,3,4,5,6])}>Daily</button>
          <button onClick={() => setDays([1,2,3,4,5])}>Weekdays</button>
        </div>
      </div>
      <div className="sheet-actions">
        <button className="btn-primary" onClick={save} disabled={!title.trim() || days.length === 0}>Save</button>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 3: Today Routines section** — in `TodayScreen`, query routines + today's completion; filter to today's scheduled; render section above Tasks. Section header has an `⊕` opening `RoutineEditorSheet`. Long-press row → delete confirm (reuse `pending` Sheet).

```tsx
const rdata = useLiveQuery(async () => {
  const [routines, done] = await Promise.all([db.routines.orderBy('sortOrder').toArray(), db.routineDone.toArray()]);
  const byRoutine = new Map<string, Set<string>>();
  for (const d of done) { (byRoutine.get(d.routineId) ?? byRoutine.set(d.routineId, new Set()).get(d.routineId)!).add(d.date); }
  return { routines, byRoutine };
});
const today = todayStr();
const todays = (rdata?.routines ?? []).filter((r) => isScheduledOn(r.days, today));
// render RoutineRow with doneDates=byRoutine.get(r.id) ?? new Set(),
//   checked=doneDates.has(today), onToggle=() => setRoutineDone(r.id, today, !checked)
```

- [ ] **Step 4: CSS** — routine row, streak, dots, daychips:

```css
.routine-row { display: flex; align-items: center; gap: var(--space-3); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--card-shadow); padding: var(--space-3) var(--space-4); }
.routine-main { flex: 1; }
.routine-top { display: flex; align-items: center; justify-content: space-between; }
.routine-title { font-weight: 500; }
.routine-streak { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.routine-dots { display: flex; gap: 5px; margin-top: 6px; }
.rdot { width: 7px; height: 7px; border-radius: 50%; }
.rdot.done { background: var(--accent); }
.rdot.missed { background: transparent; border: 1px solid var(--border-strong); }
.rdot.off { background: var(--border); opacity: 0.5; }
.daychips { display: flex; gap: 6px; }
.daychip { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-strong); color: var(--muted); font-weight: 600; }
.daychip.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.presets { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
.presets button { font-size: 13px; color: var(--muted); padding: 6px var(--space-3); border: 1px solid var(--border); border-radius: 999px; }
```

- [ ] **Step 5: Manual check** — create a routine (Daily) → appears on Today; check it → 🔥 1, first dot fills; reload → persists.

- [ ] **Step 6: e2e** — `e2e/routines.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
// standard DB-wipe beforeEach (copy from spaces.spec.ts)
test('create routine → shows on Today → check → streak 1', async ({ page }) => {
  await page.getByRole('button', { name: /add routine/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Meditate');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Meditate')).toBeVisible();
  await page.getByRole('checkbox', { name: /meditate/i }).click();
  await expect(page.getByText('🔥 1')).toBeVisible();
});
```

- [ ] **Step 7: Reviewer + verify + commit**

```bash
npm run verify
git add src/ e2e/ && git commit -m "feat(routines): Today routines section, create + streaks + dots"
```

**Phase 3 done when:** create/complete routines on Today; streak + dots correct; verify green.

---

## Phase 4 — Ideas page

**Goal:** Ideas page aggregates all ideas across spaces, each with its space label.

### Task 4.1: IdeasScreen

**Files:** Modify `src/screens/IdeasScreen.tsx`; reuse `IdeaRow` (add optional space label)

- [ ] **Step 1: Extend `IdeaRow`** to optionally show a space label:

```tsx
// add prop: spaceName?: string; render after the title:
{spaceName && <span className="idea-space">{spaceName}</span>}
```
CSS: `.idea-space { font-size: 12px; color: var(--muted); white-space: nowrap; }` and ensure `.idea-main` lays icon · title · space · time.

- [ ] **Step 2: IdeasScreen** — query all ideas + lists; sort updatedAt desc; render `IdeaRow` with `spaceName`; tap → `navigate({name:'idea', id})`; long-press → delete confirm (reuse `pending` Sheet). FAB `+` → CaptureSheet defaulting to idea.

```tsx
const data = useLiveQuery(async () => {
  const [ideas, lists] = await Promise.all([db.ideas.toArray(), db.lists.toArray()]);
  const names = new Map(lists.map((l) => [l.id, l.name]));
  return { ideas: ideas.sort((a, b) => b.updatedAt - a.updatedAt), names };
});
```

- [ ] **Step 3: e2e** `e2e/ideas-page.spec.ts` — seed ideas in two spaces via `__tudu`, open app, assert both appear on the Ideas pane with space labels; tap opens editor.

- [ ] **Step 4: Reviewer + verify + commit**

```bash
npm run verify
git add src/ e2e/ && git commit -m "feat(ideas): all-ideas page with space labels"
```

**Phase 4 done when:** Ideas page lists every idea with space labels; tap → editor; verify green.

---

## Phase 5 — Polish + SPEC + docs

**Goal:** Empty states, contrast, SPEC.md rewrite, README/screenshot refresh, final review.

### Task 5.1: SPEC.md rewrite
- [ ] Update SPEC.md: remove "repeat tasks" from Out-of-scope; add routines; replace Home/List-view screen sections with the 3-page model; rename List→Space in copy (note internal `lists`); document routines/routineDone + streak logic as unit-tested contracts. Commit `docs(spec): TUDU 2.0 model`.

### Task 5.2: Empty states + contrast
- [ ] Today: hint when no routines and no tasks. Ideas: hint when empty. Spaces: existing hint. Darken `--muted` toward `#6b6b6b` (light) for WCAG AA (from review). Commit.

### Task 5.3: README + screenshots
- [ ] Refresh README feature list (routines, streaks, 3-page nav, Spaces). Regenerate `docs/screenshot.png` (Today page). Commit.

### Task 5.4: Final pass
- [ ] `npm run verify` green; reviewer on the full branch diff; fix findings; update `phases/README.md` note if applicable. Push; watch CI; confirm live.

---

## Self-review notes (author)
- Spec coverage: nav (P1), rename (P1), Today tasks (P2), default-due-today (P2), routines+streaks (P3), Ideas (P4), SPEC/polish (P5) — all covered.
- Types consistent: `Routine`/`RoutineDone`, `createRoutine`/`setRoutineDone`/`getRoutineDoneDates`, `streak`/`last7`/`isScheduledOn`, `taskGroup`/`TaskGroupKey` used identically across tasks.
- Data safety: Dexie version bumped to 2 additively (existing `lists`/`tasks`/`ideas` unchanged) → on-device data preserved.
- e2e migration: `lists.spec.ts`→`spaces.spec.ts` with Spaces-dot clicks; capture/today assertions moved to Phase 2; new nav/routines/ideas specs.
