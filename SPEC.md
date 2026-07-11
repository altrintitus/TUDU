# TUDU — SPEC

Personal PWA for capturing **tasks** and **ideas**, organized into **lists**. iPhone-first, installed from Safari via Add to Home Screen. No App Store, no backend, no accounts. Hosted free on GitHub Pages; anyone can use it from the URL or fork the repo. Name is a play on "to-do".

> Status: locked 2026-07-08 after design interview. This file is self-contained — a fresh session implements against it without the interview transcript.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Platform | Serverless PWA, GitHub Pages, iPhone-first (must also work in desktop browsers) |
| Storage | On-device IndexedDB via Dexie; `navigator.storage.persist()`; JSON export/import backup |
| Structure | **Spaces** (renamed from "List" in the UI; internal store stays `lists`) contain tasks + ideas; `Inbox` is a permanent default space. **Routines** are global (not in a space). |
| Navigation | Three horizontally-swipeable pages, minimal 3-dot indicator, lands on **Today**: **Today** (routines + tasks) · **Spaces** · **Ideas**. Space/idea detail push over the pager. |
| Today | Routines section (today's scheduled, per-routine 🔥 streak + 7-day dots) then Tasks (all open one-off tasks across spaces, grouped Overdue/Today/Upcoming/No-date, with space labels) |
| Routines | Global recurring habits; weekday schedule (default Daily); consistency streak + 7-day history. Never "overdue" |
| Space view | Two tabs: Tasks / Ideas |
| Tasks | Title + checkbox + optional due **date** (no time); **new tasks default to due=today**. Done tasks auto-archive out of default view |
| Ideas | Plain text blob; first line = title in rows. The Ideas page aggregates all ideas across spaces, each tagged with its space |
| Capture | Context-aware global `[+]` per page (Today→task, Ideas→idea, Space→task/idea); keyboard auto-focused; space chip (defaults last-used); optional due date when Task. Routines created from the Today ⊕. Save ≈ 3 seconds |
| Gamification | Per-routine streaks + 7-day dots only. No points/levels |
| Reminders | **None** (no push, no local notifications — iOS PWA limitation, ratified). Due dates surface in-app only |
| Stack | Vite + React + TypeScript + Dexie + vite-plugin-pwa |
| Design | Minimal, dark-first; light mode follows `prefers-color-scheme` |
| Verify | `npm run verify` = typecheck + lint + unit + e2e. Nothing ships unverified |

## Out of scope (v1)

Push/local notifications · cross-device sync · tags · subtasks · priorities · markdown rendering · search · multi-user · points/levels/badges · routine reminders · routine *times* or monthly routines. Do not build speculative hooks for them.

> **2.0 note:** recurring "routines" (previously out of scope) are now a first-class feature — see the Navigation/Routines rows above and the data model below. Detailed design: `docs/superpowers/specs/2026-07-11-nav-routines-gamification-design.md`.

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
```

- Dexie tables (schema **version 2**, additive): `lists`, `tasks`, `ideas`, `routines`, `routineDone`. Indexes: `tasks: id, listId, dueDate` (no `done` index — booleans aren't valid IndexedDB keys; filter in JS); `ideas: id, listId, updatedAt`; `lists: id, sortOrder`; `routines: id, sortOrder`; `routineDone: id, routineId, date`.
- `Inbox` space created on first run (`id` fixed constant `"inbox"`); cannot be deleted or renamed away — guard in delete/rename paths. Hidden from the Spaces page while empty.
- Deleting a space prompts, then deletes its tasks + ideas (no orphans). Deleting a routine cascades its completions.
- **Routine streak** (unit-tested, `logic/routines.ts`): consecutive completed *scheduled* days ending at the latest scheduled day that is completed or is today (today-not-done doesn't break it); non-scheduled days are skipped. 7-day dots = done / missed / off(not-scheduled) over the trailing 7 calendar days.

## Date logic (unit-test this)

- `today` = local date string `YYYY-MM-DD` from device clock.
- **Today tasks** = `!done` tasks grouped Overdue (`dueDate < today`) / Today (`== today`) / Upcoming (`> today`) / No-date; overdue styled distinctly; within a group sort by `dueDate` then `createdAt`.
- **Routine streak** = consecutive completed *scheduled* days ending at the latest scheduled day that is completed or is today; non-scheduled days skipped. See `logic/routines.ts` (unit-tested).
- No timezone math beyond local date formatting — dates are calendar dates, not instants.

## Screens & behaviors

Three horizontally-swipeable top-level pages (minimal 3-dot indicator, lands on **Today**): **Today · Spaces · Ideas**. Space and idea detail push full-screen over the pager. Only the active pane's FAB is shown.

### Today (landing)
- **Routines** section: today's scheduled routines. Row = checkbox · name · `🔥 streak` · 7-day dot row (done/missed/off). Check → records today's completion; routines stay visible when checked and are never "overdue". Section header has an ⊕ to add a routine.
- **Tasks** section: all open one-off tasks across every space, grouped Overdue/Today/Upcoming/No-date, each showing its **space** label + due chip. Checking completes it (leaves Today). Tap → edit; long-press → delete.

### Spaces
- Header "Spaces" + settings gear. Space cards: emoji · name · open-task + idea counts. Tap → space detail. `+ New space` creates (name + optional emoji); edit affordance → rename / delete. The permanent **Inbox** space is hidden while empty, shown once it holds anything.

### Ideas
- Every idea across all spaces, `updatedAt` desc: ✦ · first-line title · **space** label · relative time. Tap → idea editor; long-press → delete.

### Capture (context-aware `[+]`)
- Today `+` → new **task** (no type toggle); Space detail `+` → task/idea into that space; Ideas `+` → new **idea**. Routines are created from the Today ⊕.
- Bottom sheet, text auto-focused. Controls: `Task | Idea` toggle **only when the page doesn't fix the type** (persists last freely-chosen type), space chip (defaults last-used, falls back Inbox), due-date field when Task. New tasks default `dueDate = today`. Empty text = disabled save. State (last type, last space) in `localStorage`.

### Routine editor
- Name + weekday chips (M–S) with Daily / Weekdays presets; default **Daily**. Save guards empty name / zero days (with a re-entry guard).

### Space detail
- Header: emoji + name, back. Tabs **Tasks** / **Ideas** (remember last tab per session). Tasks: open sorted `dueDate` then `createdAt`; check → collapsed `Done (n)`. Ideas: first line + relative time, `updatedAt` desc. Per-space `[+]` adds directly here.

### Idea editor
- Full-screen plain-text editor, autosaves (debounce + on blur/background/close), updates `updatedAt`; header Delete. No formatting UI.

### Settings (sheet off the Spaces page)
- Export: single JSON `{ version: 1, exportedAt, lists, tasks, ideas, routines, routineDone }` via share sheet / download.
- Import: file picker → validate shape → **replace all** after explicit confirm (no merge). Pre-2.0 backups (no routine fields) still import.
- Show storage-persist status + data counts + app version.

## PWA & iOS requirements

- `vite-plugin-pwa`: manifest (name `TUDU`, `display: standalone`, dark theme-color, icons 192/512 + maskable + `apple-touch-icon`), service worker precaching app shell — full offline after first load.
- Vite `base` must match repo path (`/TUDU/`) for Pages; use **hash routing** (back gesture works, no 404 tricks).
- iOS gotchas (honor all): `viewport-fit=cover` + safe-area insets; `100dvh` not `100vh`; inputs `font-size ≥ 16px` (blocks focus zoom); `overscroll-behavior` to stop rubber-band; no `beforeinstallprompt` on iOS → show one-time "Share → Add to Home Screen" hint when not standalone; IndexedDB can fail in private browsing → visible error banner, don't silently drop writes.
- Request `navigator.storage.persist()` on first write.

## Design language

Minimal dark-first: near-black layered surfaces, one restrained accent, crisp type, generous tap targets (≥44px), subtle motion (sheet slide, row check-out). Light theme via `prefers-color-scheme`. Build UI with the `frontend-design` skill; avoid generic-AI look.

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
