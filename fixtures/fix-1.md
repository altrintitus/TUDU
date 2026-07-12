# Fix Batch 1 — on-device feedback

Source: user testing on iPhone (screenshots 2026-07-12). Organized as **Global fixes** (apply everywhere, not repeated per-page), then **per-page** items. Each item: **Problem → Root cause (file:line) → Fix → Status**.

Status legend: ✅ confirmed (clear what to do) · ❓ OPEN QUESTION (needs user decision — see top section) · ⚠️ platform limitation.

---

## 0. DECISIONS (resolved with user 2026-07-12)

1. **Keyboard bar (Global G2):** user wants the **whole block removed**. Honest constraint: iOS gives web/PWA **no API** to delete the keyboard accessory bar; only native apps can. **Best-effort plan** (do all): eliminate every native form field from the keyboard context so there's nothing for iOS to attach a form bar to — (i) replace the capture `<textarea>` and the sheet name `<input>`s with a **`contenteditable`** element (no form-assistant → no `∧ ∨` prev/next), (ii) make the space picker and the schedule/date picker **custom tap controls** (buttons that open their own sheet / the date picker on demand), NOT focusable `<select>`/`<input>` fields, (iii) add `<meta name="viewport" … interactive-widget=resizes-content>`. This **removes the prev/next chevrons for certain**; whether iOS still draws a bare bar for `contenteditable` **varies by iOS version and MUST be verified on the user's iPhone**. If a residual OS bar remains, it is not removable by web code — report back and we accept it. Status → ⚠️ best-effort + device-verify.
2. **Flame color:** **Ember orange-red `#FF6A1A`** → new token `--flame`. The one intentional accent; update `design-system.md` when shipped.
3. **Stray routines (Progress #2):** **Add routine management on Progress** (tap-to-edit / long-press-delete, shared editor) **AND one-time delete the 3× `Exercise`** routines (cascades their completions).
4. **Gamify (Progress #3):** **Richer stats only** (best-ever streak, total completions, this-week vs last-week trend, completion %). No levels/XP, badges, or celebration animation for now.

---

## FEATURE A — Water tracker (implement FIRST, before the fixes)

**Goal:** Track daily water intake against a settable goal, via a **draggable bar**. Log it on **Today**; show progress on **Progress** (gamified stat).

**Data (Dexie v3, additive — no risk to existing stores):**
- New store `water: 'date'` → `{ date: 'YYYY-MM-DD', ml: number }` (one row per day; id = date).
- Daily goal in `localStorage` key `tudu.water.goalMl` (default **3000**). Presets **2500 / 3000 / 3500 / 4000** ml (2.5 / 3 / 3.5 / 4 L).
- `db.ts`: `setWater(date, ml)` (put; delete row when ml≤0), `getWaterDates()` for history. `useLiveQuery` on `db.water`.
- Pure logic `logic/water.ts` (unit-tested): `GOAL_PRESETS`, `loadGoal()/saveGoal()`, `formatL(ml)` → `"1.5 L"`, `fillFraction(ml, goal)` clamped 0..1, `snap(ml, step=250)`, `goalMetDays(rows, goal, today, window)`.

**`WaterMeter` component (draggable):**
- Horizontal track; fill width = `fillFraction(todayMl, goal)`. Ember or blue fill? → use a calm **water blue** `#3BA7FF` (distinct from the ember flame; water reads as blue). Label center: `"1.5 / 3.0 L"`.
- **Drag** anywhere on the track (pointer events) → set today's ml from x-position, snapped to **250 ml**, clamped `[0, goal]`. Tap also sets. Persists via `setWater`.
- **Goal selector:** small chips `2.5 · 3 · 3.5 · 4 L` under the bar; tap sets goal (localStorage). (Custom value out of scope for now.)
- a11y: `role="slider"`, `aria-valuemin/max/now`, `aria-label="Water intake"`, keyboard ←/→ adjust by 250.

**Placement:**
- **Today:** a **"Water"** section (below Routines, above Tasks) with the draggable `WaterMeter` + goal chips — the daily logging surface.
- **Progress:** show **today's water fill** (read-only bar) + a gamified stat **"Goal met — N of last 30 days"** (or a small ring). Keep minimal; do NOT fold water into the routine/task streak.

**Files:** `db.ts` (v3 store + CRUD), `logic/water.ts` + `tests/water.test.ts`, `components/WaterMeter.tsx`, `screens/TodayScreen.tsx`, `screens/ProgressScreen.tsx`, `styles.css`, `components/icons.tsx` (droplet icon). Backup (`logic/backup.ts`) should round-trip the `water` store (add `water?` to `BackupV1`, like routines).

---

## GLOBAL FIXES (apply on every page/sheet; not repeated below)

### G1 ✅ — Sheets don't raise the keyboard automatically
**Problem:** Opening New space / Edit space / New routine (and tapping their name field) does **not** pop the keyboard (screenshots 1.03.21, 1.04.36, 12.53.14). Field shows a cursor but no keyboard.
**Root cause (two bugs):**
- `src/components/Sheet.tsx:11-17` — focuses the first field inside a **post-paint `useEffect`**. iOS only raises the keyboard when `.focus()` runs **synchronously inside the tap gesture** (discrete-event flush). `CaptureSheet` gets this right with `useLayoutEffect` (`CaptureSheet.tsx:26-28`); `Sheet` does not.
- The name inputs are `readOnly` until focus (`ListEditorSheet.tsx:17,52-53`; `RoutineEditorSheet.tsx:11,35-36`). A **`readOnly` input cannot take focus / raise the keyboard**, so the `Sheet` focus call is a no-op and the `onFocus`→un-readonly never fires from the programmatic focus. This "anti-autofill" hack backfires.
**Fix:**
- Remove the `readOnly`/`nameRO`/`ro` hack from `ListEditorSheet` and `RoutineEditorSheet`.
- Give the primary field a real synchronous autofocus: either add an `autoFocus`-style `useLayoutEffect(() => ref.current?.focus(), [])` inside each sheet's own body (like CaptureSheet), or have `Sheet` accept an `initialFocusRef` and focus it in a `useLayoutEffect`. Focus the **name field**, not the first button.
- Keep autofill suppressed the correct way (see G2 note) without `readOnly`.
**Files:** `components/Sheet.tsx`, `components/ListEditorSheet.tsx`, `components/RoutineEditorSheet.tsx`, `components/TaskEditSheet.tsx` (same `titleRO` hack, `TaskEditSheet.tsx:14,34`).

### G2 ⚠️ — Remove the keyboard "box" (iOS accessory bar) — best-effort + device-verify
**Problem:** Bar with `∧ ∨ … ✓` above the keyboard when adding tasks/routines (12.57.19). User wants the **whole block** gone everywhere (highest priority).
**Hard constraint:** This is the **native iOS keyboard accessory/form-assistant bar**, drawn by iOS. Web/PWA has **no API to delete it** — only native apps can null the `inputAccessoryView`. The prev/next `∧ ∨` chevrons specifically appear because a sheet exposes **multiple focusable form controls** (textarea + `<select>` + date input).
**Best-effort fix (strongest achievable — do all, then verify on device):**
1. **Replace text `<textarea>`/`<input>` with a `contenteditable` element** for the capture text and the name fields. `contenteditable` is not a form field → **no form-assistant / no `∧ ∨` prev-next**. (Keep an accessible label; mirror value into state via `onInput`.)
2. **Make the space picker and schedule/date picker custom, non-focusable tap controls** (buttons that open our own bottom sheet / trigger the date picker on demand) so no `<select>`/`<input type=date>` is present in the keyboard context.
3. Add `interactive-widget=resizes-content` to the `<meta name="viewport">` (index.html) for good measure.
**Reality check:** Steps 1–2 remove the prev/next chevrons **for certain**. Whether iOS still shows a **bare** bar for `contenteditable` **varies by iOS version — must be verified on the user's iPhone.** If a residual bar remains after this, it cannot be removed by web code; report back and we accept it.
**Files:** `components/CaptureSheet.tsx`, `components/ListEditorSheet.tsx`, `components/RoutineEditorSheet.tsx`, `components/TaskEditSheet.tsx`, `index.html`, `styles.css`.

### G3 ✅ — "Inbox" shown/defaulted even when unused
**Problem:** Capture space dropdown defaults to **Inbox** and lists it even though the user only uses real spaces (Work, Day to Day) and Inbox is hidden/empty (IMG_5068, 1.08.22).
**Root cause:** `logic/captureDefaults.ts:9` defaults `listId` to `'inbox'`. `CaptureSheet.tsx:33` only falls back to Inbox; it never prefers a real list. The `<select>` (`CaptureSheet.tsx:94-105`) renders **all** lists incl. empty Inbox.
**Fix (apply the same rule the Spaces page uses):**
- Dropdown options = **visible spaces** only: show Inbox **only if** it has content **or** there are no other spaces (mirror `SpacesScreen.tsx:35-41` `visibleLists`).
- Default selected space = last-used *if still valid & visible*, else the **first visible non-Inbox space**, else Inbox (only when nothing else exists).
- New/first-run users (no real spaces yet) still get Inbox as the single fallback so capture never breaks.
**Files:** `components/CaptureSheet.tsx`, `logic/captureDefaults.ts` (change default resolution; keep `'inbox'` only as last resort).

### G4 ✅ — Empty date box → "Schedule" + calendar icon; bigger controls
**Problem:** In capture, the due-date box is blank/unlabeled and both boxes look cramped (IMG_5068).
**Root cause:** `CaptureSheet.tsx:107-115` uses a raw `<input type=date>` (no label when empty); controls use `min-height:44px` (`styles.css .capture-list/.capture-due` ~363-370).
**Fix:**
- Replace the empty native date field with a custom **"Schedule" control**: shows a small calendar icon + the word "Schedule" when no date; shows the formatted date when set; tapping opens the date picker. (This also helps G2 by removing a native focusable field.)
- Increase height of the space control + schedule control (e.g. `min-height: 48–52px`, more padding) so the row isn't cluttered.
- Apply anywhere a schedule/date box appears (capture on every page, `TaskEditSheet`).
**Files:** `components/CaptureSheet.tsx`, `components/TaskEditSheet.tsx`, `styles.css`. New calendar icon in `components/icons.tsx`.

### G5 ✅ — Hide the vertical scrollbar ("scroll wheel at the right")
**Problem:** A white vertical scrollbar shows on the right edge of the pages (12.51.04).
**Root cause:** `.pager-track` hides its scrollbar (`styles.css:676`) but each `.pager-pane` has `overflow-y:auto` (`styles.css:677-684`) and shows the native scrollbar.
**Fix:** Add `scrollbar-width:none` + `.pager-pane::-webkit-scrollbar{display:none}` to `.pager-pane` (and any other scroll containers: list/idea/settings screens). Keep scrolling functional, just hide the bar.
**Files:** `styles.css`.

### G6 ✅ — Long-press selects text / shows Copy·Look Up·Translate
**Problem:** Long-pressing a routine to delete also triggers iOS text selection + the Copy/Look Up/Translate callout, and selects the word "Delete" (12.55.01).
**Root cause:** Rows are long-pressable but text is user-selectable; `useLongPress` only prevents `contextmenu`, not selection/callout.
**Fix:** Add to long-pressable rows (routine rows, task rows) and their text: `-webkit-user-select:none; user-select:none; -webkit-touch-callout:none;`. Optionally `touch-action: manipulation`. This stops the selection UI so only our delete sheet appears.
**Files:** `styles.css` (`.routine-row`, `.task-row`, titles), maybe a shared `.no-select` utility.

---

## TODAY PAGE

1. ✅ **Remove right scrollbar** → **Global G5**.
2. ✅ **Flame color + satisfying done animation**
   - **Flame red** → new token **`--flame: #FF6A1A`** (ember orange-red). Currently the flame inherits `--muted`/`--faint` (nearly invisible on dark, "looks very bad"). Fill the flame with `--flame`; keep the outline (streak 0) dimmed. One intentional accent — note in `design-system.md`.
   - **Strike-through animation on done:** when a task **or routine** is checked, animate a line striking through the words (draw left→right ~250–300ms + slight fade) — minimal + satisfying.
     - Root cause / gap: routines don't get a "done" state on the title at all (`RoutineRow.tsx` never adds a done class); tasks have a **static** `text-decoration:line-through` (`styles.css:479`) with no animation.
     - Fix: add a `done` class to `RoutineRow` when checked today; implement an animated strike (pseudo-element width 0→100%, or a background-size line) on `.task-title`/`.routine-title` when done. On Today a checked task **leaves** the list — make sure the strike plays before removal (small delay or animate-then-remove) so it's visible.
   - **Files:** `components/icons.tsx` (flame fill uses `--flame`), `components/RoutineRow.tsx` (done class), `components/TaskListRow.tsx`/`TaskRow.tsx`, `styles.css`.
3. ✅/❓ **Tapping a routine does nothing; name field won't focus; day-chips buggy**
   - **Tap-to-edit (gap):** routine rows have no tap handler — only checkbox toggle + long-press delete (`RoutineRow.tsx:18-31`). **Add:** tapping the row (not the checkbox) opens the routine editor **in edit mode** (pre-filled name + repeat days, with Save + Delete). Requires extending `RoutineEditorSheet` to accept an existing routine and an `updateRoutine(id, {title, days})` in `db.ts`.
   - **Name field won't open keyboard** → **Global G1**.
   - ❓ **Day chips "buggy most times"** (12.53.14): needs on-device reproduction. Candidate causes: `Sheet`'s auto-focus stealing the tap, missing `touch-action: manipulation` on `.daychip`, or double-fire from the surrounding press handling. `toggleDay` logic itself (`RoutineEditorSheet.tsx:15-16`) is correct. Proposed: add `touch-action:manipulation` + `type="button"` (already present) + verify no focus/pointer interference after G1, then retest. **If still buggy, tell me exactly how (taps ignored? wrong day toggles? double-toggles?).**
   - **Files:** `components/RoutineRow.tsx`, `components/RoutineEditorSheet.tsx`, `db.ts`, `styles.css`.
4. ✅ **Long-press delete box: remove the redundant top "Delete" + stop text selection**
   - The delete confirm sheet shows **two** "Delete"s: the sheet **title** "Delete" (`TodayScreen.tsx:121` `title="Delete"`) and the body "Delete "name"?". **Remove the title** (pass no title, or `title=""`), keep the body + Confirm/Cancel.
   - The selected-word / Copy·Look Up·Translate callout → **Global G6**.
   - **Files:** `screens/TodayScreen.tsx`, `styles.css`.
5. ⚠️ **Remove keyboard box when adding tasks/routines** → **Global G2** (platform-limited; see Q1).
6. ✅ **Inbox default + "Schedule" date box + bigger controls** → **Global G3 + G4**.

---

## SPACES PAGE

1. ✅ **Move Settings to the last page + change its icon**
   - **Problem:** Settings entry is a **sun-like** icon in the Spaces header (1.01.59) — reads as a light/dark toggle.
   - **Root cause:** `SpacesScreen.tsx:47-57` renders a circle-with-rays SVG (looks like brightness/sun).
   - **Fix:** Remove the settings button from the Spaces header; add a Settings entry on the **Progress page** (the last/3rd page) top-right. Use a clearer icon — a proper **gear** (with teeth) or a **sliders/person** glyph, not the sun. (Confirm placement: top-right of Progress header.)
   - **Files:** `screens/SpacesScreen.tsx` (remove), `screens/ProgressScreen.tsx` (add button + `navigate({name:'settings'})`), `components/icons.tsx` (new gear icon).
2. ✅ **Triple-dots → Edit space: keyboard doesn't auto-open** → **Global G1** (`ListEditorSheet`).
3. ✅ **New space: keyboard doesn't auto-open** → **Global G1** (`ListEditorSheet`).
4. ✅ **Task→Idea toggle drops the keyboard**
   - **Problem:** Switching the Task/Idea segmented toggle blurs the text field and dismisses the keyboard (1.08.22).
   - **Root cause:** `CaptureSheet.tsx:87-92` — tapping a segmented `<button>` moves focus off the `<textarea>`, so iOS hides the keyboard.
   - **Fix:** keep focus on the textarea when toggling type: use `onMouseDown/onPointerDown` with `e.preventDefault()` on the toggle buttons (so focus never leaves the field), or programmatically `textareaRef.focus()` after toggling. Verify keyboard stays up.
   - **Files:** `components/CaptureSheet.tsx`.

---

## PROGRESS PAGE

1. ✅ **Cluttered empty state (text overlap) + low insight**
   - **Problem:** "Complete a routine or task to start a streak" **overlaps** the "30-DAY ACTIVITY" heading (1.09.46); page feels barren/cluttered.
   - **Root cause:** `ProgressScreen.tsx:42-52` — when `noHistory`, the hint `<p class="empty-hint">` renders with no spacing directly above the always-rendered sections → visual overlap. Also with zero data the hero area collapses and the empty heatmap dominates.
   - **Fix:** proper empty-state layout (reserve the hero space / add margins so nothing overlaps); consider hiding or compacting the heatmap until there's ≥1 day of activity; give the hint its own block with vertical rhythm.
   - **Files:** `screens/ProgressScreen.tsx`, `styles.css`.
2. ✅ **"Random" routines (3× Exercise) + no way to manage them**
   - Progress lists **all** routines (`ProgressScreen.tsx:65-84`), including ones not scheduled today, which you can't reach from Today. **Fix:** add **tap-to-edit / long-press-delete** to Progress routine rows (shares the editor from Today #3), **and one-time delete the 3× `Exercise`** routines (`deleteRoutine` cascades their completions).
3. ✅ **Gamify more / more insight — richer stats**
   - Add to the Tasks/stats area (and hero): **best-ever streak**, **total completions** (routines + tasks all-time), **this-week vs last-week trend** (▲/▼ or a mini delta), **completion %**. Keep minimal + on-brand; no levels/XP, badges, or celebration animation this round.
   - Also fix the barren feel from Progress#1 (empty-state spacing). Files: `screens/ProgressScreen.tsx`, `logic/stats.ts` (add best-streak/total/last-week helpers, unit-tested), `styles.css`.

---

## Change-map (files touched, once implemented)

| File | Fixes |
|------|-------|
| `src/components/Sheet.tsx` | G1 (sync autofocus, focus name field) |
| `src/components/ListEditorSheet.tsx` | G1 (drop readOnly hack) |
| `src/components/RoutineEditorSheet.tsx` | G1, Today#3 (edit mode, day-chip retest) |
| `src/components/TaskEditSheet.tsx` | G1, G4 (schedule control) |
| `src/components/CaptureSheet.tsx` | G2, G3, G4, Spaces#4 (toggle keeps focus) |
| `src/components/RoutineRow.tsx` | Today#2 (done class), Today#3 (tap-to-edit), G6 |
| `src/components/TaskListRow.tsx` / `TaskRow.tsx` | Today#2 (strike anim), G6 |
| `src/components/icons.tsx` | flame `--flame` color, new calendar + gear icons |
| `src/screens/TodayScreen.tsx` | Today#4 (drop "Delete" title) |
| `src/screens/SpacesScreen.tsx` | Spaces#1 (remove settings button) |
| `src/screens/ProgressScreen.tsx` | Progress#1/#2/#3, Spaces#1 (settings entry), routine management |
| `src/logic/captureDefaults.ts` | G3 (default resolution) |
| `src/db.ts` | Today#3 (`updateRoutine`) |
| `src/styles.css` | G4, G5, G6, flame color, strike animation, empty-state |
| `src/hooks/useLongPress.ts` | G6 (optional) |

## Notes
- **Design-system deviation:** the red flame is the first intentional color accent; update memory `design-system.md` when shipped.
- **Data safety:** all fixes are UI/logic; no Dexie schema change. `updateRoutine` is additive CRUD. Deleting stray `Exercise` routines cascades their completions (existing `deleteRoutine`).
- **Verification:** unit-test `captureDefaults` new resolution; e2e for routine edit + capture default space; manual device pass for G1/G2/day-chips (iOS-specific).
