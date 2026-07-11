# TUDU 2.0 — 3-page nav · routines · gamification

> Design spec. Approved by user 2026-07-11 (brainstorming session). This
> supersedes conflicting parts of `SPEC.md`; SPEC.md is updated as part of
> implementation. Recurring "routines" were previously out-of-scope — now core.

## Goal

Reshape TUDU around a **three-page swipe** UI and add lightweight **routines +
per-routine streaks** so the user stays consistent. Rename user-facing "List" →
**Space**.

## 1. Navigation

- Three horizontally-swipeable top-level pages, in order: **Today** (default /
  leftmost) · **Spaces** · **Ideas**.
- **Minimal affordance:** three small dots at the top indicating the active page
  (`● ○ ○`). Swipe left/right to move. No tab bar, no segmented control.
- Implementation: a horizontal **CSS scroll-snap** pager (`scroll-snap-type: x
  mandatory`, three full-width panes, `overflow-x: auto`). Native momentum, no JS
  pager lib. The active dot derives from scroll position (`scroll` listener →
  nearest pane). Programmatic page changes use `scrollIntoView`/`scrollTo`.
- Opening a **Space** (detail) or an **idea** (editor) pushes a full-screen view
  **over** the pager (existing hash routes `#/list/:id`, `#/idea/:id`,
  `#/settings`). Back returns to the pager at the page you left.
- The pager itself is the `home` route. Landing page = Today.
- **Settings** gear: on the **Spaces** page header only.
- iOS caveat: scroll-snap paging and the browser's left-edge back-swipe coexist —
  intra-app paging is handled by the horizontal scroll container; the left-edge
  back gesture still maps to browser history (acceptable, matches existing
  hash-route back behavior). We don't intercept the edge gesture.

## 2. Rename: List → Space (UI only)

- All user-facing copy: "Space"/"Spaces", "New space", "add to <space>", "Edit
  space", "Delete space".
- **Internal data layer is unchanged**: Dexie store stays `lists`, type stays
  `List`, `INBOX_ID = 'inbox'`. This preserves the user's on-device data (no
  migration/wipe). Code comments note UI name = Space. A full data-migrating
  rename is a possible future follow-up, not now.

## 3. Page: Today (landing)

Header: title **"Today"**. Minimal (no wordmark, no extra headline stat).

### Routines section
- Lists routines **scheduled for today** (today's weekday ∈ routine.days).
- Row: checkbox · name · `🔥 <streak>` · 7-day dot row `●●●●●○●`.
- Check → record completion for today (streak/dots update); uncheck → remove
  today's completion. Completed routines **stay visible** (checked) — seeing the
  ✓ and streak is the reward. No Done-collapse for routines.
- Routines are **never overdue** and never show danger styling.
- Section header has an **⊕ add-routine** affordance (see §6).
- Empty (no routines scheduled today) → section hidden; if the user has zero
  routines at all, show a one-line hint to add one.

### Tasks section
- **All open one-off tasks across every space**, grouped:
  **Overdue → Today → Upcoming → No date** (empty groups hidden).
  - Overdue: `dueDate < today`. Today: `dueDate == today`. Upcoming: `dueDate >
    today`. No date: no `dueDate`.
  - Within a group: sort by `dueDate` then `createdAt`.
- Row: checkbox · title · **space label** (source space name) · due chip.
  Overdue rows styled danger (as today's TodayStrip does).
- Checking a task → done → it leaves the Today page (archives into its space's
  Done, existing behavior). No Done section on Today.
- Tap a task row → TaskEditSheet (existing). Long-press → delete confirm.

### New-task default
- Creating a task with **no due date chosen defaults `dueDate = today`** so it
  appears under Today without the user deciding a date. Choosing another date (or
  explicitly clearing it) overrides.

## 4. Page: Spaces

- Was the old Home, **minus** the Today strip (Today page replaces it).
- Header: title **"Spaces"** + settings gear.
- Space cards: emoji · name · open-task count · idea count (icons per current
  design). Inbox space remains the capture fallback and is **hidden while empty**
  (existing behavior), shown once it holds anything.
- `+ New space` (was "New list").

## 5. Page: Ideas

- Header: title **"Ideas"**.
- **All ideas across all spaces**, sorted `updatedAt` desc.
- Row: ✦ spark icon · first-line title · **space label** · relative time. Tap →
  idea editor. Long-press → delete confirm.
- Empty → one-line hint.

## 6. Creating items (context-aware +)

A single FAB `+` per page, behaving by context (no Task/Idea toggle unless
needed):
- **Today** `+` → new **task** (title, due defaults today, space chip defaults
  last-used/Inbox).
- **Today · Routines** `⊕` → new **routine**: title + weekday chips
  (M T W T F S S) with presets **Daily** (all, the default) / **Weekdays**
  (Mon–Fri). Default = Daily so it's zero-decision.
- **Space detail** `+` → add to that space; small task/idea switch (existing
  per-list capture, `fixedListId`).
- **Ideas** `+` → new **idea** (space chip).
- Tasks & ideas have **no schedule/timer** field — only routines are scheduled.

## 7. Data model

New Dexie stores (bump Dexie version, additive — no change to existing stores):

```ts
interface Routine {
  id: string;            // crypto.randomUUID()
  title: string;
  days: number[];        // JS weekday indices 0=Sun..6=Sat; [0..6] = daily (default)
  sortOrder: number;
  createdAt: number;
}
interface RoutineDone {
  id: string;            // `${routineId}:${date}` (idempotent, natural key)
  routineId: string;
  date: string;          // 'YYYY-MM-DD' local
}
```

- Stores: `routines: 'id, sortOrder'`, `routineDone: 'id, routineId, date'`.
- `tasks`/`ideas`/`lists` schemas unchanged.
- `RoutineDone.id = routineId:date` makes completion idempotent (toggling can't
  create dupes) and deletion trivial.

## 8. Routine logic (pure, unit-tested → `src/logic/routines.ts`)

- `isScheduledOn(routine, date): boolean` — `routine.days.includes(getDay(date))`.
- `streak(routine, doneDates: Set<string>, today): number` — walk backward from
  `today` over calendar days; skip days not scheduled; for each scheduled day:
  completed → `streak++`; not completed **and in the past** → stop; not completed
  **and == today** → skip (today still in progress, don't break, don't count).
  Returns consecutive completed scheduled days ending at the latest
  completed-or-today scheduled day.
- `last7(routine, doneDates, today): ('done'|'missed'|'off')[]` — for
  `today-6 … today`: not scheduled → `off`; scheduled & completed → `done`;
  scheduled & not completed → `missed` (today included as `missed`/pending).
- All date math via existing `todayStr`/local-date helpers; no timezone math
  beyond local calendar dates.

## 9. Streak edge rules

- Day boundary = device local date (`todayStr`).
- A scheduled day that ends without completion breaks that routine's streak.
- Today not-yet-done does **not** break the streak (in progress).
- Changing a routine's `days` does not rewrite history; streak recomputes against
  the new schedule going forward and over stored completions.

## 10. Gamification (minimal)

- Per-routine `🔥 <streak>` + 7-day dots only. No points, no levels, no separate
  headline stat (kept intentionally minimal per user).
- Optional subtle touch (nice-to-have, not required for v1 of this work): a small
  celebratory affordance when all of today's routines are done. Deferred unless
  cheap.

## 11. SPEC.md changes

- Remove "repeat tasks" from Out-of-scope; add **routines** as a first-class
  concept.
- Replace the Home/Today/List-view screen descriptions with the 3-page model.
- Rename user-facing List → Space in SPEC copy (note internal `lists`).
- Document the new data model (routines, routineDone) and streak logic as
  unit-tested contracts.

## 12. Implementation phases (each `npm run verify` green + reviewer)

1. **Nav shell + rename**: 3-page scroll-snap pager with dots; move current
   Home content to the Spaces page; rename UI List→Space; Today/Ideas pages as
   placeholders. Keep all existing e2e green (update selectors for the new home).
2. **Today page**: Tasks section (all open tasks grouped, space labels,
   default-due-today) + wire task rows. Retire the standalone TodayStrip.
3. **Routines + streaks**: data model, `logic/routines.ts` (+ unit tests),
   Routines section on Today, routine creation (⊕), streak 🔥 + 7-day dots.
4. **Ideas page**: all-ideas aggregation with space labels.
5. **Polish**: empty states, animations, contrast, SPEC.md rewrite, README/
   screenshot refresh.

## 13. Testing

- **Unit**: `routines.ts` streak/dots/scheduled (boundaries: missed day breaks,
  today-in-progress doesn't, non-scheduled days skipped, 7-day window).
- **e2e** (new/updated): swipe/scroll between the 3 pages (dots update); create a
  routine → appears on Today → check → streak = 1 → dot filled; task defaults to
  Today and shows space label; Ideas page aggregates across spaces; existing
  space CRUD + capture + backup + offline stay green (selectors updated for the
  pager home).

## 14. Non-goals (this work)

Points/XP/levels, badges, notifications/reminders for routines, routine due
*times*, monthly routines, cross-device sync, reordering via drag. (Monthly
routines and a celebration flourish may come later.)
