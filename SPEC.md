# TUDU — SPEC

Personal PWA for capturing **tasks** and **notes**, organized into **spaces**, plus daily **routines** and a **water** tracker. iPhone-first, installed from Safari via Add to Home Screen. No App Store, no backend, no accounts. Hosted free on GitHub Pages; anyone can use it from the URL or fork the repo. Name is a play on "to-do".

> Status: locked 2026-07-08 after design interview. This file is self-contained — a fresh session implements against it without the interview transcript.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Platform | Serverless PWA, GitHub Pages, iPhone-first (must also work in desktop browsers) |
| Storage | On-device IndexedDB via Dexie; `navigator.storage.persist()`; JSON export/import backup |
| Structure | **Spaces** (renamed from "List" in the UI; internal store stays `lists`) contain tasks + notes (**Notes** is the UI label; internal store stays `ideas`); `Inbox` is a permanent default space. **Routines** are global (not in a space). |
| Navigation | Three horizontally-swipeable pages, minimal 3-dot indicator, lands on **Today**: **Today** (routines + water + tasks) · **Spaces** · **Progress**. Space/note detail push over the pager. |
| Today | Routines section (today's scheduled, per-routine flame streak + 7-day dots), a **Water** tracker (draggable daily intake vs goal), then Tasks (all open one-off tasks across spaces, grouped Overdue/Today/Upcoming/No-date, with space labels) |
| Routines | Global recurring habits; weekday schedule (default Daily); consistency streak + 7-day history. Never "overdue" |
| Space view | Two tabs: Tasks / Notes |
| Tasks | Title + checkbox + optional due **date** (no time); **new tasks default to due=today**. Done tasks auto-archive out of default view |
| Notes | Plain text blob; first line = title in rows. Notes (UI label; internal store `ideas`) live **inside each Space** (Tasks/Notes tabs) — there is no standalone Notes page |
| Progress | Read-only performance page: hero day-streak + best, three stat cards (total done, 30-day consistency %, vs-last-week trend), 30-day activity heatmap, per-routine flame + streak + 7-day dots, task stats (done today / this week, keep-up rate, overdue), and water goal-met (30d). Derives from `doneAt` + `routineDone` + `water` |
| Capture | Context-aware global `[+]` per page (Today→task, Space→task/idea); keyboard auto-focused; space chip (defaults last-used); optional due date when Task. Routines created from the Today ⊕. Progress is read-only (no capture). Save ≈ 3 seconds |
| Gamification | Per-routine streaks + 7-day dots, plus a read-only Progress page (overall day-streak + best, total done, 30-day consistency %, week-over-week trend). No points/levels/badges |
| Reminders | **None** (no push, no local notifications — iOS PWA limitation, ratified). Due dates surface in-app only |
| Stack | Vite + React + TypeScript + Dexie + vite-plugin-pwa |
| Design | Minimal, dark-first; light mode follows `prefers-color-scheme` |
| Verify | `npm run verify` = typecheck + lint + unit + e2e. Nothing ships unverified |

## Out of scope (v1)

Push/local notifications · cross-device sync · tags · subtasks · priorities · markdown rendering · search · multi-user · points/levels/badges · routine reminders · routine *times* or monthly routines. Do not build speculative hooks for them.

> **2.0 note:** recurring "routines" (previously out of scope) are now a first-class feature — see the Navigation/Routines rows above and the data model below. Detailed design: `docs/superpowers/specs/2026-07-11-nav-routines-gamification-design.md`. The **water tracker** and the expanded **Progress** page shipped in later 2.x updates; this spec has been reconciled to match the shipped app.

---

## Data model

```ts
// db.ts — Dexie schema, single source of truth
interface List {
  id: string;          // crypto.randomUUID()
  name: string;
  emoji?: string;      // single emoji, optional
  sortOrder: number;
  createdAt: number;   // epoch ms
}

interface Task {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  doneAt?: number;
  dueDate?: string;    // 'YYYY-MM-DD', local date, no time
  createdAt: number;
}

interface Idea {
  id: string;
  listId: string;
  text: string;        // first line = display title
  createdAt: number;
  updatedAt: number;
}

// Routines are global (no space). days = JS weekday indices 0=Sun..6=Sat; [0..6] = daily.
interface Routine { id: string; title: string; days: number[]; sortOrder: number; createdAt: number; }
// One completion; id = `${routineId}:${date}` makes toggling idempotent.
interface RoutineDone { id: string; routineId: string; date: string; } // date 'YYYY-MM-DD' local
// Daily water intake in millilitres for one local date; id = date.
interface Water { date: string; ml: number; } // date 'YYYY-MM-DD' local
// The daily water *goal* is a preference, not a row: localStorage['tudu.water.goalMl']
// (default 3500; presets 2500/3000/3500/4000). Carried in JSON backup via `prefs`.
```

- Dexie tables (schema **version 3**, additive): `lists`, `tasks`, `ideas`, `routines`, `routineDone`, `water`. Indexes: `tasks: id, listId, dueDate` (no `done` index — booleans aren't valid IndexedDB keys; filter in JS); `ideas: id, listId, updatedAt`; `lists: id, sortOrder`; `routines: id, sortOrder`; `routineDone: id, routineId, date`; `water: date` (keyed by the local date string).
- `Inbox` space created on first run (`id` fixed constant `"inbox"`); cannot be deleted or renamed away — guard in delete/rename paths. Hidden from the Spaces page while empty.
- Deleting a space prompts, then deletes its tasks + ideas (no orphans). Deleting a routine cascades its completions.
- **Routine streak** (unit-tested, `logic/routines.ts`): consecutive completed *scheduled* days ending at the latest scheduled day that is completed or is today (today-not-done doesn't break it); non-scheduled days are skipped. 7-day dots = done / missed / off(not-scheduled) over the trailing 7 calendar days.

## Date logic (unit-test this)

- `today` = local date string `YYYY-MM-DD` from device clock.
- **Today tasks** = `!done` tasks grouped Overdue (`dueDate < today`) / Today (`== today`) / Upcoming (`> today`) / No-date; overdue styled distinctly; within a group sort by `dueDate` then `createdAt`.
- **Routine streak** = consecutive completed *scheduled* days ending at the latest scheduled day that is completed or is today; non-scheduled days skipped. See `logic/routines.ts` (unit-tested).
- **Progress stats** (unit-tested, `logic/stats.ts`): overall day-streak (any-completion days), 30-day activity counts + heat levels, task keep-up rate. Derived from `Task.doneAt` + `routineDone` — no schema change.
- No timezone math beyond local date formatting — dates are calendar dates, not instants.

## Screens & behaviors

Three horizontally-swipeable top-level pages (minimal 3-dot indicator, lands on **Today**): **Today · Spaces · Progress**. Space and idea detail push full-screen over the pager. Only the active pane's FAB is shown.

### Today (landing)
- **Routines** section: today's scheduled routines. Row = checkbox · name · flame streak (custom SVG glyph, not the 🔥 emoji) · 7-day dot row (done/missed/off). Check → records today's completion; routines stay visible when checked and are never "overdue". Section header has an ⊕ to add a routine.
- **Water** section: a draggable daily-intake meter (millilitres, snapped to 250 ml steps) against a goal set once from the header (default 3.5 L; presets 2.5/3/3.5/4 L in `localStorage['tudu.water.goalMl']`). Reactive across the Today + Progress panes.
- **Tasks** section: all open one-off tasks across every space, grouped Overdue/Today/Upcoming/No-date, each showing its **space** label + due chip. Checking completes it (leaves Today). Tap → edit; long-press → delete.

### Spaces
- Header "Spaces" + settings gear. Space cards: emoji · name · open-task + idea counts. Tap → space detail. `+ New space` creates (name + optional emoji); edit affordance → rename / delete. The permanent **Inbox** space is hidden while empty, shown once it holds anything.

### Progress
- Read-only analytics (no FAB). **Hero**: overall day-streak (consecutive days with ≥1 routine or task completed; today-not-yet-active doesn't break it) + best-ever run, with the custom flame. **Stat cards**: total completions all-time, 30-day consistency % (active days / 30), and this-week-vs-last-week trend. **30-day activity**: weekday-aligned heatmap shaded by daily completion count (routines done + tasks `doneAt`). **Routines**: every routine with flame + streak + 7-day dots. **Tasks**: done today / done this week / keep-up rate (`doneWeek / (doneWeek + overdue)`, `—` when both 0) / overdue count. **Water**: read-only meter + goal-met days in the last 30. Before any history exists, the page shows a prompt plus the routines and water sections only.
- Notes are **not** a top-level page — they live inside each Space (see Space detail). Capture a note via the Spaces `[+]` (Task/Note toggle) or a Space's own `[+]`.

### Capture (context-aware `[+]`)
- Today `+` → new **task** (no type toggle); Space detail `+` → task/note into that space; Spaces `+` → task/note (Task/Note toggle). Routines are created from the Today ⊕.
- Bottom sheet, text auto-focused. Controls: `Task | Note` toggle **only when the page doesn't fix the type** (persists last freely-chosen type), space chip (defaults last-used, falls back Inbox), due-date field when Task. New tasks default `dueDate = today`. Empty text = disabled save. State (last type, last space) in `localStorage`. Capture **and** the edit sheets use a contenteditable field + custom tap-menus (no native form controls) so iOS shows no keyboard assistant bar.

### Routine editor
- Name + weekday chips (M–S) with Daily / Weekdays presets; default **Daily**. Save guards empty name / zero days (with a re-entry guard).

### Space detail
- Header: emoji + name, back. Tabs **Tasks** / **Notes** (remember last tab per session). Tasks: open sorted `dueDate` then `createdAt`; check → collapsed `Done (n)`. Notes: first line + relative time, `updatedAt` desc. Per-space `[+]` adds directly here.

### Note editor
- Full-screen plain-text editor (internal store `ideas`), autosaves (debounce + on blur/background/close), updates `updatedAt`; header Delete. No formatting UI.

### Settings (sheet off the Spaces page)
- Export: single JSON `{ version: 1, exportedAt, lists, tasks, ideas, routines, routineDone, water, prefs }` — `prefs.waterGoalMl` carries the daily water goal — via share sheet / download.
- Import: file picker → validate shape → **replace all** after explicit confirm (no merge). Pre-2.0 backups (no routine fields) still import.
- Show storage-persist status + data counts + app version.

## PWA & iOS requirements

- `vite-plugin-pwa`: manifest (name `TUDU`, `display: standalone`, dark theme-color, icons 192/512 + maskable + `apple-touch-icon`), service worker precaching app shell — full offline after first load.
- Vite `base` must match repo path (`/TUDU/`) for Pages; use **hash routing** (back gesture works, no 404 tricks).
- iOS gotchas (honor all): `viewport-fit=cover` + safe-area insets; `100dvh` not `100vh`; inputs `font-size ≥ 16px` (blocks focus zoom); `overscroll-behavior` to stop rubber-band; no `beforeinstallprompt` on iOS → show one-time "Share → Add to Home Screen" hint when not standalone; IndexedDB can fail in private browsing → visible error banner, don't silently drop writes.
- Request `navigator.storage.persist()` on first write.

## Design language

Minimal dark-first: near-black layered surfaces, two restrained accents (**flame** `#ff6a1a` for streaks, **water** `#3ba7ff` for the tracker), crisp type, generous tap targets (≥44px), subtle motion (sheet slide, row check-out). Light theme via `prefers-color-scheme`. Build UI with the `frontend-design` skill; avoid generic-AI look.

## Project structure

```
src/
  main.tsx  App.tsx  db.ts
  logic/dates.ts  logic/backup.ts       # pure, unit-tested
  components/                            # TodayStrip, ListCard, ListView,
                                         # CaptureSheet, TaskRow, IdeaRow,
                                         # IdeaEditor, SettingsSheet
tests/                                   # vitest unit
e2e/                                     # Playwright, iPhone viewport
.github/workflows/deploy.yml             # build → Pages on push to main
```

## Verification (the contract)

`npm run verify` runs, in order: `tsc --noEmit` → ESLint → vitest → Playwright (mobile-Safari-like profile, e.g. iPhone 14). All green before any commit.

- **Unit**: date logic (today/overdue boundaries), backup export→import roundtrip (byte-equal data), first-line-title extraction, Inbox guards.
- **E2E**: capture task with today's due → appears in Today strip → check → lands in Done; capture idea → appears in list with first-line title → edit persists after reload (IndexedDB survives); create list → capture into it via list chip; export → wipe → import → data restored.
- **Manual (once, on device)**: Lighthouse PWA installable; iPhone Safari → Add to Home Screen → launches standalone, works in airplane mode.

## Deploy & sharing

GitHub Actions: on push to `main`, build + deploy to Pages. README covers: what TUDU is, screenshot, install-on-iPhone steps (visit URL → Share → Add to Home Screen), local dev (`npm i && npm run dev`), privacy note (all data stays on your device). MIT license.
