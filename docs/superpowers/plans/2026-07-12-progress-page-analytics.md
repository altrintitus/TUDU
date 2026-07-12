# Progress Page + Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone Ideas swipe-page with a **Progress** page (hero streak, 30-day activity heatmap, per-routine flames, task keep-up stats), add a custom flame icon, and fix five QA defects.

**Architecture:** Analytics derive from existing data (`Task.doneAt`, `RoutineDone`) via a new pure `logic/stats.ts` (unit-tested, no db dependency). A read-only `ProgressScreen` swaps into pane 3 of the existing `Pager` (count stays 3 → no pager change). Ideas stay fully alive inside each Space; only the aggregate page is removed.

**Tech Stack:** React + TypeScript, Dexie + dexie-react-hooks (`useLiveQuery`), Vitest, Playwright. Design tokens from `src/styles.css` (monochrome ink-on-paper).

**Spec:** `docs/superpowers/specs/2026-07-12-progress-page-analytics-design.md`

**Branch:** `feat/progress-page` (already created; main auto-deploys to device — do NOT commit to main).

---

### Task 1: Stats logic (`logic/stats.ts`) — TDD

**Files:**
- Create: `src/logic/stats.ts`
- Test: `tests/stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { activityByDay, overallStreak, activityWindow, heatLevel, taskStats } from '../src/logic/stats';

// local-noon epoch ms for a YYYY-MM-DD (avoids TZ edge at midnight)
const ms = (d: string) => new Date(`${d}T12:00:00`).getTime();

describe('activityByDay', () => {
  it('counts routine completions + task doneAt per local date', () => {
    const m = activityByDay(
      [
        { done: true, doneAt: ms('2026-07-11') },
        { done: true, doneAt: ms('2026-07-11') },
        { done: false }, // open task ignored
        { done: true } // done but no doneAt ignored
      ],
      [{ date: '2026-07-11' }, { date: '2026-07-10' }]
    );
    expect(m.get('2026-07-11')).toBe(3); // 2 tasks + 1 routine
    expect(m.get('2026-07-10')).toBe(1);
    expect(m.has('2026-07-09')).toBe(false);
  });
});

describe('overallStreak', () => {
  const today = '2026-07-11';
  it('counts consecutive active days ending today', () => {
    const a = new Map([['2026-07-09', 1], ['2026-07-10', 2], ['2026-07-11', 1]]);
    expect(overallStreak(a, today)).toEqual({ current: 3, best: 3 });
  });
  it('empty today does NOT break the run (counts through yesterday)', () => {
    const a = new Map([['2026-07-09', 1], ['2026-07-10', 1]]);
    expect(overallStreak(a, today).current).toBe(2);
  });
  it('a gap before today breaks current but best keeps the longest run', () => {
    const a = new Map([['2026-07-05', 1], ['2026-07-06', 1], ['2026-07-07', 1], ['2026-07-11', 1]]);
    const r = overallStreak(a, today);
    expect(r.current).toBe(1);
    expect(r.best).toBe(3);
  });
  it('all empty → 0/0', () => {
    expect(overallStreak(new Map(), today)).toEqual({ current: 0, best: 0 });
  });
});

describe('activityWindow', () => {
  it('returns N days ending today, oldest first, 0 when no activity', () => {
    const a = new Map([['2026-07-11', 4]]);
    const w = activityWindow(a, '2026-07-11', 3);
    expect(w.map((c) => c.date)).toEqual(['2026-07-09', '2026-07-10', '2026-07-11']);
    expect(w.map((c) => c.count)).toEqual([0, 0, 4]);
  });
});

describe('heatLevel', () => {
  it('buckets 0 / 1-2 / 3-4 / 5+', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('taskStats', () => {
  const today = '2026-07-11';
  it('done today/week from doneAt, overdue from dueDate, keepUpRate', () => {
    const s = taskStats(
      [
        { done: true, doneAt: ms('2026-07-11') },              // today + week
        { done: true, doneAt: ms('2026-07-06') },              // week edge (today-5)
        { done: true, doneAt: ms('2026-07-01') },              // older, out of week
        { done: false, dueDate: '2026-07-09' },                // overdue + open
        { done: false, dueDate: '2026-07-20' }                 // open, future
      ],
      today
    );
    expect(s.doneToday).toBe(1);
    expect(s.doneWeek).toBe(2);
    expect(s.open).toBe(2);
    expect(s.overdue).toBe(1);
    expect(s.keepUpRate).toBe(67); // 2 / (2 + 1) = 66.7 → 67
  });
  it('keepUpRate is null when nothing done this week and nothing overdue', () => {
    expect(taskStats([{ done: false, dueDate: '2026-07-20' }], today).keepUpRate).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stats.test.ts`
Expected: FAIL — cannot find module `../src/logic/stats`.

- [ ] **Step 3: Write minimal implementation**

Create `src/logic/stats.ts`:

```ts
// Pure performance analytics over tasks + routine completions. Local calendar
// dates only (YYYY-MM-DD via todayStr). No db.ts dependency — accepts plain shapes.
import { todayStr } from './dates';

export interface TaskStat { done: boolean; doneAt?: number; dueDate?: string }
export interface DoneRow { date: string }

function addDays(d: string, n: number): string {
  const dt = new Date(`${d}T00:00:00`);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

// completions per local date: each routineDone row + each done task's doneAt date.
export function activityByDay(tasks: TaskStat[], routineDone: DoneRow[]): Map<string, number> {
  const m = new Map<string, number>();
  const bump = (d: string) => m.set(d, (m.get(d) ?? 0) + 1);
  for (const r of routineDone) bump(r.date);
  for (const t of tasks) if (t.done && t.doneAt !== undefined) bump(todayStr(new Date(t.doneAt)));
  return m;
}

// current: consecutive active days ending today (today-empty does NOT break —
// you may not be done yet). best: longest active run anywhere in history.
export function overallStreak(activity: Map<string, number>, today: string): { current: number; best: number } {
  const active = (d: string) => (activity.get(d) ?? 0) > 0;
  let current = 0;
  let d = active(today) ? today : addDays(today, -1);
  while (active(d)) { current++; d = addDays(d, -1); }

  const dates = [...activity.keys()].filter((k) => (activity.get(k) ?? 0) > 0).sort();
  let best = 0, run = 0, prev = '';
  for (const cur of dates) {
    run = prev && addDays(prev, 1) === cur ? run + 1 : 1;
    if (run > best) best = run;
    prev = cur;
  }
  return { current, best: Math.max(best, current) };
}

// N local dates ending today, oldest first, with each day's completion count.
export function activityWindow(activity: Map<string, number>, today: string, days: number): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    out.push({ date: d, count: activity.get(d) ?? 0 });
  }
  return out;
}

export function heatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
}

export function taskStats(tasks: TaskStat[], today: string): {
  doneToday: number; doneWeek: number; open: number; overdue: number; keepUpRate: number | null;
} {
  const weekAgo = addDays(today, -6);
  let doneToday = 0, doneWeek = 0, open = 0, overdue = 0;
  for (const t of tasks) {
    if (t.done) {
      if (t.doneAt !== undefined) {
        const d = todayStr(new Date(t.doneAt));
        if (d === today) doneToday++;
        if (d >= weekAgo && d <= today) doneWeek++;
      }
    } else {
      open++;
      if (t.dueDate && t.dueDate < today) overdue++;
    }
  }
  const denom = doneWeek + overdue;
  return { doneToday, doneWeek, open, overdue, keepUpRate: denom === 0 ? null : Math.round((doneWeek / denom) * 100) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/stats.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.ts tests/stats.test.ts
git commit -m "feat(stats): pure analytics logic (streak, heatmap, task stats)"
```

---

### Task 2: Flame icon + routine row

**Files:**
- Modify: `src/components/icons.tsx` (append `Flame`)
- Modify: `src/components/RoutineRow.tsx:22-24`
- Modify: `src/styles.css` (routine-streak flex + zero state)

- [ ] **Step 1: Add the `Flame` icon**

Append to `src/components/icons.tsx`:

```tsx
// Streak flame. filled = ink silhouette (streak ≥ 1); outline = dimmed (streak 0).
export function Flame({ filled = true, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'} strokeWidth={filled ? 0 : 1.3}>
      <path d="M8.5 1.4c.3 1.6-.5 2.7-1.4 3.7-1 1.1-2.2 2.3-2.2 4.3a3.6 3.6 0 0 0 7.2 0c0-1-.4-1.9-1-2.6-.2.5-.6.9-1.1 1.1.7-1.8 0-4.2-1.5-6.5z"
        strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Swap the emoji in `RoutineRow`**

In `src/components/RoutineRow.tsx`, add the import (line 4 area):

```tsx
import { Flame } from './icons';
```

Replace the streak span (currently `<span className="routine-streak">🔥 {s}</span>`):

```tsx
<span className={s > 0 ? 'routine-streak' : 'routine-streak zero'}>
  <Flame filled={s > 0} size={14} /> {s}
</span>
```

- [ ] **Step 3: Style the streak span**

In `src/styles.css`, replace the `.routine-streak` rule (currently around line 516):

```css
.routine-streak { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.routine-streak.zero { color: var(--faint); }
```

- [ ] **Step 4: Verify build + existing tests**

Run: `npx tsc --noEmit && npx eslint src/components/icons.tsx src/components/RoutineRow.tsx && npx vitest run`
Expected: no type/lint errors; all unit tests pass. (Flame renders visually — screenshot check in Task 6.)

- [ ] **Step 5: Commit**

```bash
git add src/components/icons.tsx src/components/RoutineRow.tsx src/styles.css
git commit -m "feat(routines): custom flame icon; muted zero-streak state"
```

---

### Task 3: Progress screen + pane swap; delete Ideas page

**Files:**
- Create: `src/screens/ProgressScreen.tsx`
- Modify: `src/styles.css` (progress styles + pane-padding selector)
- Modify: `src/App.tsx:7,57` (import + pane)
- Delete: `src/screens/IdeasScreen.tsx`

- [ ] **Step 1: Create `ProgressScreen`**

Create `src/screens/ProgressScreen.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { todayStr } from '../logic/dates';
import { streak, last7 } from '../logic/routines';
import { activityByDay, overallStreak, activityWindow, heatLevel, taskStats } from '../logic/stats';
import { Flame } from '../components/icons';

export function ProgressScreen() {
  const today = todayStr();
  const data = useLiveQuery(async () => {
    const [tasks, routines, routineDone] = await Promise.all([
      db.tasks.toArray(),
      db.routines.orderBy('sortOrder').toArray(),
      db.routineDone.toArray()
    ]);
    const byRoutine = new Map<string, Set<string>>();
    for (const r of routineDone) {
      let s = byRoutine.get(r.routineId);
      if (!s) { s = new Set(); byRoutine.set(r.routineId, s); }
      s.add(r.date);
    }
    return { tasks, routines, routineDone, byRoutine };
  });

  const header = <header className="screen-header"><h1 className="screen-title">Progress</h1></header>;
  if (!data) return <div className="progress-screen">{header}</div>;

  const activity = activityByDay(data.tasks, data.routineDone);
  const { current, best } = overallStreak(activity, today);
  const window30 = activityWindow(activity, today, 30);
  const ts = taskStats(data.tasks, today);
  const noHistory = current === 0 && best === 0;

  // weekday-align the grid: leading blanks before the first cell's weekday (Sun=0)
  const firstDow = new Date(`${window30[0].date}T00:00:00`).getDay();
  const activeDays = window30.filter((c) => c.count > 0).length;

  return (
    <div className="progress-screen">
      {header}

      {noHistory ? (
        <p className="empty-hint">Complete a routine or task to start a streak</p>
      ) : (
        <div className="progress-hero">
          <Flame filled={current > 0} size={40} />
          <div className="hero-streak">{current}</div>
          <div className="hero-label">
            day streak{best > 0 && <span className="hero-best"> · best {best}</span>}
          </div>
        </div>
      )}

      <section className="progress-section">
        <h2 className="section-label">30-day activity</h2>
        <div className="heatmap" aria-hidden="true">
          {Array.from({ length: firstDow }, (_, i) => <span key={`b${i}`} className="hcell blank" />)}
          {window30.map((c) => <span key={c.date} className={`hcell heat-${heatLevel(c.count)}`} />)}
        </div>
        <p className="sr-only">{activeDays} active days in the last 30</p>
      </section>

      <section className="progress-section">
        <h2 className="section-label">Routines</h2>
        {data.routines.length === 0 && <p className="routines-empty">No routines yet</p>}
        {data.routines.map((r) => {
          const dd = data.byRoutine.get(r.id) ?? new Set<string>();
          const s = streak(r.days, dd, today);
          const dots = last7(r.days, dd, today);
          return (
            <div className="routine-row" key={r.id}>
              <div className="routine-main">
                <div className="routine-top">
                  <span className="routine-title">{r.title}</span>
                  <span className={s > 0 ? 'routine-streak' : 'routine-streak zero'}>
                    <Flame filled={s > 0} size={14} /> {s}
                  </span>
                </div>
                <div className="routine-dots">{dots.map((d, i) => <span key={i} className={`rdot ${d}`} />)}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="progress-section">
        <h2 className="section-label">Tasks</h2>
        <div className="settings-row"><span>Done today</span><span className="settings-value">{ts.doneToday}</span></div>
        <div className="settings-row"><span>Done this week</span><span className="settings-value">{ts.doneWeek}</span></div>
        <div className="settings-row"><span>Kept up</span><span className="settings-value">{ts.keepUpRate === null ? '—' : `${ts.keepUpRate}%`}</span></div>
        <div className="settings-row"><span>Overdue</span><span className="settings-value">{ts.overdue}</span></div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add progress styles + register the pane selector**

In `src/styles.css`, change the pane-padding selector (currently `.today-screen, .spaces-screen, .ideas-screen {`) to:

```css
.today-screen, .spaces-screen, .progress-screen {
```

Then append a new block at the end of the file (before the keyframes, or after the pager block):

```css
/* ---- progress ---- */
.progress-section { margin-bottom: var(--space-6); }
.progress-hero {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-1);
  margin: var(--space-4) 0 var(--space-8); color: var(--accent);
}
.hero-streak { font-size: 56px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.hero-label { font-size: 13px; color: var(--muted); }
.hero-best { color: var(--faint); }
.heatmap { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; max-width: 264px; }
.hcell { aspect-ratio: 1; border-radius: 3px; background: var(--accent); }
.hcell.blank { background: transparent; }
.hcell.heat-0 { background: transparent; border: 1px solid var(--border); }
.hcell.heat-1 { opacity: 0.32; }
.hcell.heat-2 { opacity: 0.6; }
.hcell.heat-3 { opacity: 1; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
```

- [ ] **Step 3: Swap the pane in `App.tsx`**

Replace the import (line 7) `import { IdeasScreen } from './screens/IdeasScreen';` with:

```tsx
import { ProgressScreen } from './screens/ProgressScreen';
```

Replace the Ideas pane (currently `{ key: 'Ideas', node: <IdeasScreen /> }`) with:

```tsx
{ key: 'Progress', node: <ProgressScreen /> }
```

- [ ] **Step 4: Delete the aggregate Ideas page**

```bash
git rm src/screens/IdeasScreen.tsx
```

- [ ] **Step 5: Verify build + tests**

Run: `npx tsc --noEmit && npx eslint src/ && npx vitest run`
Expected: no errors; unit tests pass. (No remaining import of `IdeasScreen`.)

- [ ] **Step 6: Commit**

```bash
git add src/screens/ProgressScreen.tsx src/styles.css src/App.tsx
git commit -m "feat(progress): Progress page replaces Ideas pane (streak, heatmap, stats)"
```

---

### Task 4: QA fixes

**Files:**
- Modify: `src/db.ts:124-129` (`updateTask` accepts `listId`)
- Modify: `src/components/TaskEditSheet.tsx` (Space `<select>`)
- Modify: `src/screens/SettingsScreen.tsx` (counts + plural + wording)
- Modify: `package.json` (version)

- [ ] **Step 1: `updateTask` accepts a listId**

In `src/db.ts`, replace `updateTask`:

```ts
export async function updateTask(id: string, patch: { title?: string; dueDate?: string | null; listId?: string }): Promise<void> {
  const upd: Partial<Task> = {};
  if (patch.title !== undefined) upd.title = patch.title;
  if (patch.dueDate !== undefined) upd.dueDate = patch.dueDate ?? undefined;
  if (patch.listId !== undefined) upd.listId = patch.listId;
  await db.tasks.update(id, upd);
}
```

- [ ] **Step 2: Add the Space picker to the edit sheet**

Rewrite `src/components/TaskEditSheet.tsx`:

```tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { db, updateTask, deleteTask, type Task } from '../db';

export function TaskEditSheet({ open, task, onClose }: {
  open: boolean;
  task: Task | null;
  onClose(): void;
}) {
  const lists = useLiveQuery(() => db.lists.orderBy('sortOrder').toArray(), []);
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.dueDate ?? '');
  const [listId, setListId] = useState(task?.listId ?? '');
  const [confirming, setConfirming] = useState(false);
  // readonly until focus → suppresses iOS contact AutoFill on this text field
  const [titleRO, setTitleRO] = useState(true);

  if (!open || !task) return null;

  const save = async () => {
    const t = title.trim();
    if (!t) return;
    await updateTask(task.id, { title: t, dueDate: due || null, listId });
    onClose();
  };

  const remove = async () => {
    await deleteTask(task.id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit task">
      <label className="field">
        <span className="field-label">Title</span>
        <input aria-label="Title" value={title} readOnly={titleRO} onFocus={() => setTitleRO(false)} autoComplete="off" autoCorrect="off" onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Space</span>
        <select aria-label="Space" value={listId} onChange={(e) => setListId(e.target.value)}>
          {lists?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Due</span>
        <input type="date" aria-label="Due" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <div className="sheet-actions">
        {!confirming && <button className="btn-danger" onClick={() => setConfirming(true)}>Delete</button>}
        {confirming && <button className="btn-danger" onClick={remove}>Confirm — delete task</button>}
        <button className="btn-primary" onClick={save} disabled={!title.trim()}>Save</button>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 3: Style the edit-sheet select (reuse field look)**

In `src/styles.css`, extend the existing `.field input` selector list to include selects. Change `.field input {` (around line 280) to `.field input, .field select {` and `.field input:focus` to `.field input:focus, .field select:focus`, and `.field input:disabled` to `.field input:disabled, .field select:disabled`.

- [ ] **Step 4: Settings — counts, plural helper, wording**

In `src/screens/SettingsScreen.tsx`:

Add `routines` to the counts query:

```tsx
  const counts = useLiveQuery(async () => ({
    spaces: await db.lists.count(),
    tasks: await db.tasks.count(),
    ideas: await db.ideas.count(),
    routines: await db.routines.count()
  }));
```

Add a plural helper just below the imports (module scope):

```tsx
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : one + 's'}`;
```

Replace the storage Data value:

```tsx
          <span className="settings-value">
            {counts
              ? `${plural(counts.spaces, 'space')} · ${plural(counts.tasks, 'task')} · ${plural(counts.ideas, 'idea')} · ${plural(counts.routines, 'routine')}`
              : '—'}
          </span>
```

Replace the import-confirm sentence (currently "Replace everything with … lists / … tasks / … ideas?"):

```tsx
          <p className="confirm-text">
            Replace everything with {plural(pending.lists.length, 'space')} / {plural(pending.tasks.length, 'task')} /{' '}
            {plural(pending.ideas.length, 'idea')} / {plural(pending.routines?.length ?? 0, 'routine')}? This can’t be undone.
          </p>
```

- [ ] **Step 5: Bump the app version**

In `package.json`, change `"version": "0.1.0"` to `"version": "2.0.0"`.

- [ ] **Step 6: Verify build + tests**

Run: `npx tsc --noEmit && npx eslint src/ && npx vitest run`
Expected: no errors; unit tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/db.ts src/components/TaskEditSheet.tsx src/screens/SettingsScreen.tsx src/styles.css package.json
git commit -m "fix(qa): edit-task space picker; settings spaces/plural/routines; v2.0.0"
```

---

### Task 5: e2e + docs

**Files:**
- Create: `e2e/progress.spec.ts`
- Delete: `e2e/ideas-page.spec.ts`
- Modify: `e2e/nav.spec.ts:19`
- Modify: `SPEC.md` (Screens & behaviors)
- Modify: memory `design-system.md`

- [ ] **Step 1: New Progress e2e**

Create `e2e/progress.spec.ts`:

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
  await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tudu = (window as never as { __tudu: any }).__tudu;
    const iso = (off: number) => {
      const d = new Date(Date.now() + off * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    // routine 'Meditate' completed the last 3 days (incl. today) → streak 3
    await tudu.db.routines.add({ id: 'r1', title: 'Meditate', days: [0, 1, 2, 3, 4, 5, 6], sortOrder: 1, createdAt: Date.now() });
    for (const off of [-2, -1, 0]) await tudu.db.routineDone.add({ id: `r1:${iso(off)}`, routineId: 'r1', date: iso(off) });
    // one task completed today, one overdue+open
    await tudu.db.tasks.add({ id: 'tk1', listId: 'inbox', title: 'shipped it', done: true, doneAt: Date.now(), dueDate: iso(0), createdAt: Date.now() });
    await tudu.db.tasks.add({ id: 'tk2', listId: 'inbox', title: 'late thing', done: false, dueDate: iso(-3), createdAt: Date.now() });
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Progress' }).click();
});

test('Progress shows streak, 30-day heatmap, routine flame, task stats', async ({ page }) => {
  const p = page.locator('.progress-screen');
  // hero streak: routine + task active today, -1, -2 → 3
  await expect(p.locator('.hero-streak')).toHaveText('3');
  // heatmap has exactly 30 day cells (blanks excluded)
  await expect(p.locator('.heatmap .hcell:not(.blank)')).toHaveCount(30);
  // routine listed with its streak
  await expect(p.getByText('Meditate')).toBeVisible();
  await expect(p.locator('.routine-streak', { hasText: '3' })).toBeVisible();
  // task stats
  await expect(p.locator('.settings-row', { hasText: 'Done today' }).locator('.settings-value')).toHaveText('1');
  await expect(p.locator('.settings-row', { hasText: 'Overdue' }).locator('.settings-value')).toHaveText('1');
});
```

- [ ] **Step 2: Delete the Ideas-page e2e**

```bash
git rm e2e/ideas-page.spec.ts
```

- [ ] **Step 3: Update the nav spec heading**

In `e2e/nav.spec.ts`, change line 19 from:

```ts
  await expect(page.getByRole('heading', { name: 'Ideas' })).toBeVisible();
```
to:
```ts
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
```

- [ ] **Step 4: Update `SPEC.md`**

In `SPEC.md`, find the Screens & behaviors section describing the third pane as **Ideas** and update it to describe **Progress**: third swipe pane is a read-only performance page (hero day-streak + best, 30-day activity heatmap, per-routine flame + streak + 7-day dots, task stats: done today / this week / keep-up rate / overdue). State that **ideas remain per-Space** (each Space's Tasks/Ideas tabs) and are captured via the Spaces + button — there is no standalone Ideas page. If an "out of scope" or data-model note references an Ideas page, reconcile it. Keep edits surgical (only the lines that describe the third pane / ideas surface).

- [ ] **Step 5: Update the design-system memory**

In `/Users/altrintitus/.claude/projects/-Users-altrintitus-local-projects-TUDU/memory/design-system.md`, update the structure sentence: third pane is now **Progress** (streaks + 30-day heatmap + task keep-up stats), not Ideas; ideas live only inside Spaces. Add the custom `Flame` icon (in `components/icons.tsx`) to the icon list. Reference spec `2026-07-12-progress-page-analytics-design.md`.

- [ ] **Step 6: Commit**

```bash
git add e2e/progress.spec.ts e2e/nav.spec.ts SPEC.md "/Users/altrintitus/.claude/projects/-Users-altrintitus-local-projects-TUDU/memory/design-system.md"
git commit -m "test(progress): e2e for Progress page; drop ideas-page spec; docs"
```

---

### Task 6: Full verify + visual check + review

- [ ] **Step 1: Full verify (all gates)**

Run: `npm run verify`
Expected: tsc → eslint → vitest → playwright ALL green. If a Playwright pager/streak race appears, re-run once (CI config already has retries; local doesn't) before investigating.

- [ ] **Step 2: Visual check of the flame + heatmap**

With `npm run dev` running, drive Playwright to the Progress pane (seed a routine + a completed task via the `__tudu` bridge as in the e2e), screenshot `.progress-screen`. Confirm: flame reads as a flame (not a blob), heatmap grid aligns in 7 columns, hero number is legible, zero-streak routine shows a dimmed outline flame. If the flame path looks wrong, tune the `Flame` `<path d="…">` and re-screenshot.

- [ ] **Step 3: Adversarial review**

Dispatch the `reviewer` agent on the diff (`git diff main...feat/progress-page`). Focus: streak/keep-up correctness vs. the spec definitions, the removed Ideas page not orphaning any import/route/test, backup still round-trips ideas, no cross-pane e2e locator collisions. Fix any CONFIRMED correctness/SPEC issues; ignore style-only notes.

- [ ] **Step 4: Final commit (if review produced fixes)**

```bash
git add -A && git commit -m "fix(progress): address review findings"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** Progress page (Task 3) ← §A1/A3; stats (Task 1) ← §A2; flame (Task 2) ← §A4; QA B1–B4 (Task 4); ideas-stay + delete page (Task 3/5) ← §B2; tests/docs (Task 5) ← §Testing. All spec sections mapped.
- **Type consistency:** `stats.ts` exports (`activityByDay/overallStreak/activityWindow/heatLevel/taskStats`) match imports in `ProgressScreen` and `tests/stats.test.ts`. `updateTask` gains `listId?` used by `TaskEditSheet`. `counts.spaces/tasks/ideas/routines` match the Settings render. `Flame({filled,size})` matches both call sites.
- **Placeholders:** none — every code step has complete code; SPEC.md/memory edits are surgical prose edits (existing files, described precisely).
- **Risk note:** `Flame` path is provisional → Task 6 Step 2 visually verifies/tunes it. No schema/version change (Dexie stays v2); backup untouched.

## Execution Handoff

Plan saved. Two options: **(1) Subagent-driven** (fresh subagent per task, review between) or **(2) Inline** (execute here with checkpoints). Recommend inline — tasks are tightly coupled to shared files (`styles.css`, `App.tsx`) and the whole diff is one reviewer pass.
