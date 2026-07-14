# Fix Batch 2 — code review

Source: full-codebase review 2026-07-14 (not device screenshots this time — a read of `src/`, `logic/`, screens, components, hooks, `index.html`, `vite.config.ts`, styles, tests, CI). Every claim below was traced to a `file:line`; two suspected bugs were **disproved by building** and are listed under _Verified clean_ so they don't get re-flagged.

Format per item: **Problem → Root cause (file:line) → Fix → Severity.**

**Severity:** **P1** contract/correctness (should fix) · **P2** UX / robustness / coverage (worth doing) · **P3** polish / nice-to-have · ⚠️ platform-limited · 💤 needs device verification.

## Priority summary

| # | Item | Sev |
|---|------|-----|
| 1–6 | **SPEC.md is stale** — schema v2 vs v3, water feature undocumented, backup shape, accents, flame glyph, Progress stats | **P1** |
| 7 | Water **goal** not included in backup (export/import loses it) | P2 |
| 8 | Today task-complete shows **no strike animation** (row unmounts first) | P2 |
| 11 | Keyboard-bar fix only reached **CaptureSheet**; edit sheets still use native fields | P2 ⚠️💤 |
| 19 | Day chips announce "day 0…6" (a11y) | P2 |
| 25–26 | No e2e for **water tracker** or **task-edit** flows | P2 |
| 27 | **Ideas → Notes** rename (approved, unbuilt) | P2 |
| others | robustness, polish, cleanup | P3 |

---

## 1. SPEC & docs drift (P1 — the contract no longer matches the code)

`SPEC.md` is declared "the requirements contract — implement against it exactly." It has fallen behind three shipped batches (routines already reconciled; water + the Progress redesign did not). This matters because a fresh session is told to trust SPEC.

1. **Schema version wrong.** SPEC line 74 says "schema **version 2**"; `db.ts:73` is at **v3** (adds the `water` store). → Update the data-model section to v3.
2. **Water feature entirely absent from SPEC.** No mention of the tracker anywhere, yet it's a headline feature (`db.ts:45-48,206-209`, `logic/water.ts`, `components/WaterMeter.tsx`, Today + Progress sections). → Add: `Water` interface, `water: 'date'` store, goal in `localStorage['tudu.water.goalMl']` (default 3500, presets 2500/3000/3500/4000), Today "Water" section (draggable), Progress "Goal met (30d)".
3. **Backup shape out of date.** SPEC line 116 lists `{version, exportedAt, lists, tasks, ideas, routines, routineDone}` — omits `water`, which `backup.ts:20` now exports. → Add `water` to the documented shape.
4. **"One restrained accent" is now two.** SPEC line 129 says one accent; the app ships `--flame #ff6a1a` **and** `--water #3ba7ff` (`styles.css:28-29`, both with light-mode variants `:59-60`). → Reword: flame = streak accent, water = tracker accent (intentional, documented in `design-system` memory).
5. **🔥 emoji vs custom flame.** SPEC (lines 17, 92, 99) still shows the 🔥 emoji; the app renders a custom `Flame` SVG (`components/icons.tsx`, `RoutineRow.tsx:27`). → Note the custom glyph.
6. **Gamification/Progress under-documented.** SPEC line 24 says "per-routine streaks + 7-day dots **only**", but Progress now shows overall streak + best, **total done**, **30-day consistency %**, and **vs-last-week trend** (`ProgressScreen.tsx:48-52,106-112`). Still no points/levels, so intent holds — but the shipped stats aren't in SPEC. → Update the Progress + Gamification rows.

**Fix (all of §1):** one reconciliation pass on `SPEC.md` bumping it to the 2.x reality. Low risk (doc only), high value (keeps the contract honest). Also refresh the stale `vite.config.ts:22` manifest `description` and the README wording (see §8/§27).

---

## 2. Correctness & data

7. **P2 — Water goal is not backed up.** `backup.ts:15-21` round-trips the water *rows* but the daily *goal* lives in `localStorage['tudu.water.goalMl']` (`water.ts:7,14`), which export never captures. Export → wipe → import silently resets the goal to the 3.5 L default. (Capture defaults + install-hint dismissal are also localStorage, but those are throwaway prefs; the water goal is closer to real data.)
   **Fix:** add an optional `prefs?: { waterGoalMl?: number }` to `BackupV1`; `exportData` reads `loadGoal()`, `importData` calls `setWaterGoal(b.prefs.waterGoalMl)` when present. Keep it optional so old backups still validate.

8. **P2 — Today "complete" has no strike animation.** The satisfying strike (fix-1 Today#2) exists as `@keyframes strike` on `.task-row.done .task-title::after` / `.routine-row.done` (`styles.css:513-515`) and plays in the **list view** and for **routines** (which stay visible). But on **Today**, `TaskListRow` has no `done` state — `TodayScreen.tsx:36` filters `open = !done`, so a checked task unmounts on the next liveQuery tick before any animation runs.
   **Fix:** animate-then-remove on Today — briefly retain the row with a `done` class (~280 ms, matching the keyframe) before it drops, or defer the DB toggle until the strike finishes. `TaskListRow` needs a `done`-class path + the `::after` rule.

9. **P3 — Import failure is swallowed.** `SettingsScreen.tsx:73-78` awaits `importData` with no `try/catch`. A shape-valid but internally-bad backup (e.g. duplicate `id`s) throws inside the Dexie transaction (`backup.ts:52-57` `bulkAdd`) → promise rejects, sheet closes on nothing, user sees no error and possibly half-cleared data.
   **Fix:** wrap `confirmImport` in try/catch → `toast('Import failed — file may be corrupt')`; consider `bulkPut` over `bulkAdd` for idempotence.

10. **P3 — Routine checkbox can trigger long-press delete.** `RoutineRow.tsx:21-22` spreads the row's long-press pointer handlers over the whole row including the checkbox, and the checkbox (unlike `TaskRow.tsx:30`) has no `onClick`/pointer `stopPropagation`. Press-and-hold on the checkbox for 500 ms fires the delete sheet.
   **Fix:** `stopPropagation` on the checkbox's pointer-down/click, or start the long-press timer only from `.routine-main`.

---

## 3. iOS / PWA consistency

11. **P2 ⚠️💤 — The keyboard-bar work only reached CaptureSheet.** fix-1 G1/G2 migrated capture to `EditableText` (contenteditable) + custom tap-pickers so iOS shows no form-assistant bar. The other sheets were never migrated and still mount native form controls:
    - `TaskEditSheet.tsx:35,39,45` — `<input>` + `<select>` + `<input type=date>` (three focusables → the prev/next `∧ ∨` bar is back in full when editing a task).
    - `RoutineEditorSheet.tsx:42` and `ListEditorSheet.tsx:45,60` — native `<input>`.
    So the "no keyboard box" goal is inconsistent: clean on capture, unchanged on every edit sheet.
    **Fix:** swap these text fields to `EditableText`, and give `TaskEditSheet`'s Space + Due the same custom chip/menu pickers `CaptureSheet` uses (`CaptureSheet.tsx:92-123`). Residual bare-bar behaviour still needs on-device verification (same caveat as G2).

12. **P3 — Missing `interactive-widget=resizes-content`.** `index.html:5` viewport never got fix-1 G2 step 3. → append it to the `content`.

13. **P3 — Deprecated capability meta only.** `index.html:7` sets `apple-mobile-web-app-capable` but not the standard `mobile-web-app-capable`. → add both.

14. **P3 — Manifest polish.** `vite.config.ts:19-31` manifest has a stale `description` (see §1) and no `id` (recommended so installs keep a stable identity across `start_url` changes). → add `id: '/TUDU/'` and refresh the description. (`start_url`/`scope`/icons all verified correct under the `/TUDU/` base.)

---

## 4. UX polish

15. **P3 — TaskEditSheet lists Inbox unconditionally.** `TaskEditSheet.tsx:39-41` renders every list incl. an empty Inbox, unlike capture's "hide Inbox until it has content" rule (fix-1 G3, `CaptureSheet.tsx:38-41`). Minor inconsistency when reassigning a task's space.

16. **P3 — TaskEditSheet has no re-entry guard.** `TaskEditSheet.tsx:19-24` lacks the `savingRef` guard that `CaptureSheet.tsx:48` and `RoutineEditorSheet.tsx:25` use. Double-tap Save double-submits (harmless today since values are identical, but inconsistent).

17. **P3 — No "clear date" in TaskEditSheet.** Removing a due date means blanking the native date input (awkward on the wheel picker). Capture already offers a "None" chip (`CaptureSheet.tsx:118`); add the same to the edit sheet.

18. **P3 — Inbox edit sheet is a dead end.** Tapping ⋯ on the Inbox card opens `ListEditorSheet` with name/emoji disabled and Save disabled (`ListEditorSheet.tsx:48,63,80`). → hide the edit affordance for Inbox (or show a read-only note) instead of a do-nothing sheet.

---

## 5. Accessibility

19. **P2 — Day chips announce "day 0"…"day 6".** `RoutineEditorSheet.tsx:61` uses `aria-label={`day ${d}`}`, and the visible labels repeat (S M T W T F S). A screen reader user hears "day 0", "day 1"… with no way to tell the two S's/T's apart. → `aria-label` the full weekday name (`['Sunday',…,'Saturday'][d]`).

20. **P3 — Sheet has no focus trap or background scroll-lock.** `Sheet.tsx` focuses the first field but Tab escapes to the page behind, and the pager still scrolls under the backdrop. → trap Tab within `.sheet-panel` and set `body { overflow:hidden }` (or `inert` the app root) while a sheet is open.

21. **P3 — Verify slider focus on both themes.** `.water-track:focus-visible` drops the outline for a `border-color` change (`styles.css:789`). Confirm the focus ring is actually visible in light mode.

---

## 6. Code cleanup (dead / duplicated)

22. **`IdeaRow.spaceName` is dead.** `IdeaRow.tsx:9,23` accept + render `spaceName`, and the comment says "shown on the aggregated Ideas page" — but that page was removed (now Progress). `ListScreen.tsx:131-136` never passes it, so the branch never runs. → drop the prop + stale comment.

23. **`compareTodayTasks` unused by the app.** `dates.ts:31-37` is exported (and unit-tested) but `TodayScreen.tsx:58-62` sorts inline instead. → either use it in TodayScreen (DRY) or mark it test-only. Minor.

24. **`TaskRow` and `TaskListRow` are ~90% duplicate.** The only real difference is the space label (`TaskListRow.tsx` vs `TaskRow.tsx`). → optional: unify into one component with a `showSpace`/`listName` prop.

---

## 7. Test gaps (P2)

25. **No e2e for the water tracker.** It's a headline feature with only unit coverage (`tests/water.test.ts`). → add `e2e/water.spec.ts`: drag the track sets today's ml (snapped to 250), the goal sheet changes the goal, Progress reflects the new goal-met count. (Note the pager/drag caveats already in CLAUDE.md — set position via pointer events, mind the FAB bleed.)

26. **No e2e for TaskEditSheet.** Editing title/space/due and delete-from-editor aren't exercised end-to-end. → add coverage (also locks in §15–17 once fixed).

---

## 8. Pending feature — Ideas → Notes rename (approved this session, not yet built)

User approved renaming **Ideas → Notes** — confirmed they mean the same thing, so it is a **UI-label change only**, mirroring the existing "Spaces (UI) / `lists` (store)" precedent (SPEC line 15). **Keep every internal identifier**: the `ideas` Dexie store, `Idea`/`createIdea`/`deleteIdea`, `CaptureType 'idea'`, the `#/idea/:id` route, the `ideas` key in backup JSON (back-compat!), `.idea-*` CSS, and the `IdeaScreen`/`IdeaRow` filenames. No schema change, no migration, existing data + backups untouched.

**Visible strings to change (8):**
| File | Now → After |
|---|---|
| `CaptureSheet.tsx:74,88` | placeholder `New idea…` → `New note…`; toggle `Idea` → `Note` |
| `ListScreen.tsx:83,138` | tab `Ideas` → `Notes`; empty `No ideas yet` → `No notes yet` |
| `IdeaScreen.tsx:94,103` | aria `delete idea` → `delete note`; `Idea text` → `Note text` |
| `SettingsScreen.tsx:120,142` | count label `'idea'` → `'note'` (renders "3 notes") |

**Docs:** README wording (`Capture tasks and **notes**…`, Spaces bullet), SPEC.md (mark the UI rename, note internal store stays `ideas`), manifest `description`.
**Tests:** `e2e/list-view.spec.ts:49,76` tab locator `/ideas/i` → `/notes/i`. The `getByText('app idea')` data strings are arbitrary content — leave them. Backup/captureDefaults tests assert internal `ideas`/`'idea'` keys — unchanged.
**Open decision:** keep the 4-point spark tab icon (`IdeasIcon`, `icons.tsx`) or swap to a note/page glyph.

---

## Verified clean (checked, no action — do not re-flag)

- **apple-touch-icon path.** `index.html:10` uses `/icons/apple-touch-icon.png`; Vite rewrites it to `/TUDU/icons/apple-touch-icon.png` at build (confirmed in `dist/index.html`). Not broken on Pages.
- **testBridge in production.** `main.tsx:5` imports it unconditionally, but `testBridge.ts:4` guards the `window.__tudu` hook behind `import.meta.env.DEV` — nothing ships to prod.
- **Backup round-trips water rows.** `backup.ts:12,18,20,45,57` fully export/validate/import the `water` store (only the *goal* is missing — §7).
- **Scrollbars / reduced-motion / safe-area.** `styles.css:64-65` hide scrollbars app-wide (G5); `:830-833` honour `prefers-reduced-motion` incl. the strike; `100dvh` + `env(safe-area-inset-*)` used throughout.
- **CI.** `.github/workflows/deploy.yml` runs the full `verify` (tsc + eslint + vitest + Playwright webkit & chromium) on push **and** PR, deploys only after it passes.

---

## Change-map (once implemented)

| File | Items |
|------|-------|
| `SPEC.md` | §1 (v3, water, backup shape, accents, flame, Progress stats) |
| `src/logic/backup.ts` | 7 (water goal in backup), 9 (bulkPut) |
| `src/components/TaskListRow.tsx` + `styles.css` | 8 (Today strike) |
| `src/screens/SettingsScreen.tsx` | 9 (import try/catch), 27 (label) |
| `src/components/RoutineRow.tsx` | 10 (checkbox propagation) |
| `src/components/TaskEditSheet.tsx` | 11, 15, 16, 17 |
| `src/components/RoutineEditorSheet.tsx` | 11, 19 (weekday aria) |
| `src/components/ListEditorSheet.tsx` | 11, 18 (Inbox no-op) |
| `index.html` | 12, 13 |
| `vite.config.ts` | 14, 27 (manifest desc) |
| `src/components/Sheet.tsx` + `styles.css` | 20 (focus trap / scroll-lock) |
| `src/components/IdeaRow.tsx` | 22 (dead prop) |
| `src/components/CaptureSheet.tsx`, `src/screens/ListScreen.tsx`, `src/screens/IdeaScreen.tsx`, `README.md` | 27 (Notes rename) |
| `e2e/water.spec.ts` (new), `e2e/list-view.spec.ts` | 25, 26, 27 |

## Notes
- Nothing here needs a Dexie schema bump; item 7 extends `BackupV1` additively (optional field).
- §1 (SPEC) and §8 (Notes rename) are the two highest-leverage: one restores contract integrity, the other is already user-approved.
- Per project rule: verify with `npm run verify` and dispatch the `reviewer` agent on the diff before committing any of these.
