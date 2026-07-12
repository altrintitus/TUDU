# Progress Page + Analytics — Design

**Goal:** Replace the standalone Ideas swipe-page with a **Progress** page that shows routine/task performance (streaks, activity heatmap, completion stats), add a custom flame icon, and fix five QA defects found in a full click-through.

**Status:** Approved 2026-07-12. Supersedes the Ideas-page pane from `2026-07-11-nav-routines-gamification-design.md` (ideas themselves are unchanged — see §B2).

---

## Context (current state)

- 3-pane scroll-snap `Pager` (lands on Today): **Today** · **Spaces** · **Ideas**.
- Ideas exist in two places: **per-Space** (each Space has Tasks/Ideas tabs in `ListScreen`) and the **standalone Ideas page** (aggregates all ideas). Only the standalone page is being removed.
- Data already supports analytics with **no schema change**:
  - `Task.doneAt?: number` is set on completion and cleared on un-complete (`db.ts` `toggleTask`).
  - `RoutineDone { routineId, date }` holds every routine completion by local date.
  - `logic/routines.ts` already has `streak(days, done, today)` and `last7(days, done, today)`.

---

## Part A — Progress page

### A1. Placement
- `App.tsx` pager panes become `[Today, Spaces, Progress]`. `initial={0}` (Today) unchanged. Pane count stays 3 → no `Pager` logic change; dot `aria-label` derives from `key: 'Progress'`.

### A2. Stats module (`src/logic/stats.ts`) — pure, unit-tested

Independent of `db.ts` (accepts plain shapes, like `dates.ts`). All dates are local `YYYY-MM-DD` strings via existing `todayStr`.

```ts
export interface TaskStat { done: boolean; doneAt?: number; dueDate?: string }
export interface DoneRow { date: string } // a routineDone row

// completions per local date across routines + tasks.
// task doneAt (epoch ms) → local date via existing todayStr(new Date(doneAt)).
export function activityByDay(tasks: TaskStat[], routineDone: DoneRow[]): Map<string, number>;

// consecutive active days ending today (today-empty does NOT break); best run ever
export function overallStreak(activity: Map<string, number>, today: string): { current: number; best: number };

// last-N local dates ending today, each with its activity count (0 if none)
export function activityWindow(activity: Map<string, number>, today: string, days: number): { date: string; count: number }[];

// bucket a day's count into a heat level 0..3
export function heatLevel(count: number): 0 | 1 | 2 | 3; // 0→0, 1..2→1, 3..4→2, 5+→3

export function taskStats(tasks: TaskStat[], today: string): {
  doneToday: number;     // doneAt local-date == today
  doneWeek: number;      // doneAt local-date within [today-6 .. today]
  open: number;          // !done
  overdue: number;       // !done && dueDate && dueDate < today
  keepUpRate: number | null; // doneWeek/(doneWeek+overdue)*100 rounded; 0/0 → null
};
```

**Exact definitions (contract):**
- **Active day**: `activityByDay(date) > 0`, where the count = (# routineDone rows on that date) + (# tasks whose `doneAt` falls on that local date). Un-completing a task clears `doneAt`, so it stops counting — intended.
- **Hero streak `current`**: walk back from `today` while the day is active; **today counts as non-breaking even if still 0** (you haven't finished today yet). So an empty today with an active yesterday → streak continues through yesterday's run. First inactive day *before today* stops the walk.
- **Hero streak `best`**: longest run of consecutive active days anywhere from the earliest active date through today (today included only if active).
- **`heatLevel`** thresholds fixed (not quantile) for stability: `0→0, 1–2→1, 3–4→2, ≥5→3`.
- **`keepUpRate`**: `round(doneWeek / (doneWeek + overdue) * 100)`. Denominator 0 → `null` (render `—`). 100% ⇒ nothing overdue. This is a "are you keeping up" number, not an all-time completion %.

### A3. Screen (`src/screens/ProgressScreen.tsx`)

`useLiveQuery` loads `tasks`, `routines`, `routineDone`. Sections top→bottom:

1. **Header**: `<h1>Progress</h1>` (matches Today/Spaces `screen-header`).
2. **Hero**: large `<Flame filled streak={current}/>` + `current` big, `best N` muted beneath. Label "day streak". If `current===0 && best===0` (brand-new user, no history) → show a one-line hint "Complete a routine or task to start a streak" instead of a lonely 0.
3. **30-day activity** heatmap:
   - `activityWindow(activity, today, 30)` → 30 cells.
   - Rendered as a **7-column, weekday-aligned grid**: leading empty placeholder cells before the first date's weekday so columns line up Sun→Sat (or Mon→Sun — match `last7`/`RoutineRow` convention, which is Sun=0). Cell class `heat-<level>`; opacity ramp in CSS (faint outline at 0). `aria-hidden` on the grid; a visually-hidden summary ("N active days in the last 30") for a11y.
4. **Routines**: `<h2 class="section-label">Routines</h2>` then **all** routines (`orderBy('sortOrder')`), each a read-only `RoutineStatRow`: flame + streak + name + 7-day dots (reuse `last7`). No checkbox/tap here (this page is read-only analytics). Empty → "No routines yet".
5. **Tasks**: `<h2 class="section-label">Tasks</h2>`, `taskStats`:
   - Line 1: `{doneToday} done today · {doneWeek} this week`
   - Line 2: `{keepUpRate===null ? '—' : keepUpRate + '%'} kept up · {overdue} overdue`
   - Reuse `settings-row`-style two-column layout or a compact stat block.

No FAB on Progress (read-only). No capture here.

### A4. Flame icon (`Flame` in `src/components/icons.tsx`)

```tsx
export function Flame({ filled = true, size = 16 }: { filled?: boolean; size?: number }) { … }
```
- Single teardrop-flame path, `viewBox="0 0 16 16"`, `currentColor`.
- `filled` → `fill="currentColor"`, no stroke. `!filled` → `fill="none" stroke="currentColor" strokeWidth≈1.3`, plus caller dims via a muted class.
- Weight/feel consistent with `TasksIcon`/`IdeasIcon`.

`RoutineRow` (Today) and `RoutineStatRow` (Progress) render `streak >= 1 ? <Flame filled/> : <Flame filled={false}/>` with the count in a `routine-streak` (or `.muted` when 0). Removes the `🔥` emoji entirely.

---

## Part B — QA fixes

### B1. Settings storage line (`SettingsScreen.tsx`)
- Add `routines: await db.routines.count()` to the counts query.
- Add a tiny local helper `const plural = (n, one) => \`${n} ${n === 1 ? one : one + 's'}\`;`
- Storage value → `` `${plural(spaces,'space')} · ${plural(tasks,'task')} · ${plural(ideas,'idea')} · ${plural(routines,'routine')}` `` (rename **lists → spaces**).
- Import-confirm sheet text → same style, include `pending.routines?.length ?? 0` routines; rename lists→spaces.

### B2. Ideas remain (no destruction)
- **Delete** `src/screens/IdeasScreen.tsx` and `e2e/ideas-page.spec.ts` only.
- Ideas keep working via each Space's **Ideas tab** (`ListScreen`) and are still capturable through the **Spaces FAB** (Task/Idea toggle) and the in-Space add button. `ideas` store, `createIdea/updateIdea/deleteIdea`, `IdeaScreen`, `IdeaRow` all untouched. Backup still round-trips ideas.

### B3. Edit-task Space picker (`TaskEditSheet.tsx` + `db.ts`)
- Add a `<select aria-label="Space">` (options = `db.lists` by `sortOrder`) defaulting to `task.listId`.
- `updateTask` patch gains `listId?: string`; apply when present.
- Small feature-add (closes the create-vs-edit inconsistency: space is settable at capture but was previously unchangeable).

### B4. Version bump
- `package.json` `version: 0.1.0 → 2.0.0`. `__APP_VERSION__` (Vite define) already surfaces it in Settings → About.

### Explicitly OUT
- Manual theme toggle (system auto-invert is by design; not requested).
- Weekly bar chart / 12-week heatmap / on-time-vs-late split (that was the "Rich" option; user chose "Balanced").
- Any change to idea data/behavior beyond removing the aggregate page.

---

## Files

**New**
- `src/logic/stats.ts`
- `tests/stats.test.ts`
- `src/screens/ProgressScreen.tsx`
- `e2e/progress.spec.ts`

**Modify**
- `src/App.tsx` — swap Ideas pane → Progress
- `src/components/icons.tsx` — add `Flame`
- `src/components/RoutineRow.tsx` — flame instead of emoji, streak-0 state
- `src/components/TaskEditSheet.tsx` — Space `<select>`
- `src/db.ts` — `updateTask` accepts `listId`
- `src/screens/SettingsScreen.tsx` — storage/import text (spaces + plural + routines)
- `src/styles.css` — Progress page + heatmap + flame styles (tokens reused, no new accent color)
- `package.json` — version 2.0.0
- `SPEC.md` — Screens & behaviors: 3rd pane is Progress; ideas are per-Space only
- memory `design-system.md` — note Progress replaced Ideas pane

**Delete**
- `src/screens/IdeasScreen.tsx`
- `e2e/ideas-page.spec.ts`

---

## Testing

- **TDD** `stats.ts` against `tests/stats.test.ts` first: activityByDay aggregation, overallStreak (empty-today-not-breaking, gap breaks, best run, all-empty→0), activityWindow length/order, heatLevel buckets, taskStats (doneToday/doneWeek boundaries, keepUpRate incl. 0/0→null). Cover a DST-agnostic set of local dates.
- **e2e** `progress.spec.ts` (mobile-safari): seed data, swipe/dot to Progress, assert hero streak text, heatmap cell count (30), a routine's flame+streak, task stat lines. Scope locators to `.progress-screen` to avoid cross-pane `getByText` collisions (all panes mount).
- Update any e2e that referenced the Ideas dot/page (`nav.spec.ts`, offline/smoke) to expect **Progress** as pane 3.
- `npm run verify` fully green (tsc → eslint → vitest → playwright), then dispatch the **reviewer** agent on the diff before commit.

## Delivery
- Branch `feat/progress-page` (main auto-deploys to device). Merge only on user approval after verify + review.
