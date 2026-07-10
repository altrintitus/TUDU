# TUDU — SPEC

Personal PWA for capturing **tasks** and **ideas**, organized into **lists**. iPhone-first, installed from Safari via Add to Home Screen. No App Store, no backend, no accounts. Hosted free on GitHub Pages; anyone can use it from the URL or fork the repo. Name is a play on "to-do".

> Status: locked 2026-07-08 after design interview. This file is self-contained — a fresh session implements against it without the interview transcript.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Platform | Serverless PWA, GitHub Pages, iPhone-first (must also work in desktop browsers) |
| Storage | On-device IndexedDB via Dexie; `navigator.storage.persist()`; JSON export/import backup |
| Structure | Lists contain both tasks and ideas; `Inbox` is a permanent default list |
| Home | Today strip (due + overdue tasks across all lists) on top, then lists |
| List view | Two tabs: Tasks / Ideas |
| Tasks | Title + checkbox + optional due **date** (no time). Done tasks auto-archive out of default view |
| Ideas | Plain text blob; first line = title in list rows |
| Capture | Global `[+]` → bottom sheet, keyboard auto-focused, Task/Idea toggle (remembers last), list chip (defaults last-used), optional due date when Task. Save ≈ 3 seconds |
| Reminders | **None** (no push, no local notifications — iOS PWA limitation, ratified). Due dates surface in-app only |
| Stack | Vite + React + TypeScript + Dexie + vite-plugin-pwa |
| Design | Minimal, dark-first; light mode follows `prefers-color-scheme` |
| Verify | `npm run verify` = typecheck + lint + unit + e2e. Nothing ships unverified |

## Out of scope (v1)

Push/local notifications · cross-device sync · tags · repeat tasks · subtasks · priorities · markdown rendering · search · multi-user. Do not build speculative hooks for them.

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
```

- Dexie tables: `lists`, `tasks`, `ideas`. Indexes: `tasks: id, listId, dueDate` (no `done` index — booleans aren't valid IndexedDB keys; filter in JS); `ideas: id, listId, updatedAt`; `lists: id, sortOrder`.
- `Inbox` list created on first run (`id` fixed constant `"inbox"`); cannot be deleted or renamed away — guard in delete/rename paths.
- Deleting a list prompts, then deletes its tasks + ideas (no orphans).

## Date logic (unit-test this)

- `today` = local date string `YYYY-MM-DD` from device clock.
- **Today strip** = tasks where `!done && dueDate <= today`, overdue (`dueDate < today`) styled distinctly and sorted first, then by `dueDate`, then `createdAt`.
- No timezone math beyond local date formatting — dates are calendar dates, not instants.

## Screens & behaviors

### Home
- Today strip: each row shows checkbox, title, source-list name. Checking completes in place (row animates out). Hidden entirely when empty.
- Lists section: rows with emoji, name, open-task count + idea count. Tap → List view. `[+ list]` creates (name + optional emoji). Long-press (or an edit affordance) → rename / delete. The permanent **Inbox** list is hidden from this section **while empty**, and appears once it holds any task or idea — so nothing captured to the fallback list ever becomes unreachable.
- Global `[+]` FAB → Capture sheet.

### Capture sheet
- Bottom sheet over dimmed home; text input auto-focused (keyboard up immediately).
- Controls: `Task | Idea` segmented toggle (persists last choice), list chip (defaults to last-used list, falls back Inbox), due-date field only when Task selected.
- Enter/Save writes, closes, brief non-blocking confirmation. Empty text = disabled save.
- State (last type, last list) in `localStorage`.

### List view
- Header: emoji + name, back to Home. Tabs: **Tasks** / **Idea**s (remember last tab per session).
- Tasks tab: open tasks sorted `dueDate` asc (undated last), then `createdAt`. Checking → done, moves to collapsed `Done (n)` section at bottom (tap to expand; uncheck restores). Row tap → inline edit title/due; swipe or long-press → delete.
- Ideas tab: rows show first line bold + relative updated time, sorted `updatedAt` desc. Tap → Idea editor. Same delete affordance.
- Per-list `[+]` adds directly to this list (skips list chip).

### Idea editor
- Full-screen plain-text editor (single `<textarea>`-equivalent), autosaves on pause + on close, updates `updatedAt`. No formatting UI.

### Settings (modest sheet off Home)
- Export: single JSON `{ version: 1, exportedAt, lists, tasks, ideas }` via share sheet / download.
- Import: file picker → validate shape → **replace all** after explicit confirm (no merge in v1).
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
