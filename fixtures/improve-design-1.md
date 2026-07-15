# Improve Design 1 — fluidity & polish pass

Source: full UI/UX scan 2026-07-15 — every screen shot before/after at iPhone-14 width in **both themes** (dark + light), plus a read of every component/screen and all of `styles.css`.

**Design thesis.** TUDU's identity is locked (warm monochrome *ink on paper*, Comfortaa, two accents: `--flame` ember / `--water` blue). This pass does **not** re-skin — it makes the paper feel *alive*. Direction: **everything that changes state moves like paper** — sheets rise and sink, rows slide in and collapse away, ink spreads (tick, strike, tab underline). Nothing may pop in or vanish in a single frame. Second thread: **context & hierarchy** — Today knows the date, the water meter is legible at every fill level in both themes, empty states breathe.

Format per item: **Problem → Root cause (file:line, pre-change) → Improvement → Status.**

## Motion system (new tokens)

One vocabulary, used everywhere (`styles.css` `:root`):

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.22,1,0.36,1)` | (existing) decisive ease-out — enters |
| `--ease-spring` | `cubic-bezier(0.34,1.45,0.64,1)` | playful overshoot — ticks, FAB, thumb |
| `--ease-in` | `cubic-bezier(0.4,0,1,1)` | accelerating — exits |
| `--t-fast / --t / --t-slow` | `140ms / 240ms / 340ms` | micro / standard / entrance |

All new motion is `transform`/`opacity` only (60 fps on iPhone) and every animation is disabled under `prefers-reduced-motion` (CSS media block + JS `matchMedia` guards for the sequenced ones).

---

## 1. Fluidity — nothing may snap

1. **Sheets vanished in one frame on close.** Enter had `rise-sheet`, but close unmounted instantly (`Sheet.tsx:28` `if (!open) return null`, parents unmount on `onClose`). *The single biggest fluidity killer — every dialog in the app ended with a hard cut.*
   → New `useSheetDismiss(onClose)` hook (Sheet.tsx): plays a `closing` phase (backdrop fades out, panel sinks, `pointer-events:none`) then calls the parent's `onClose` ~180 ms later; instant under reduced-motion. Wired into **every** sheet: TaskEdit, RoutineEditor, ListEditor, WaterGoal, Capture, and the delete/replace confirm sheets (Today, List, Note editor, Settings). **Status: ✅**

2. **Toast popped out with no exit.** `Toast.tsx:19` unmounted at 1800 ms; only an enter keyframe existed (`styles.css:427`).
   → Two-phase host: `out` class at ~1550 ms plays `toast-out` (drop + fade), unmount after. **Status: ✅**

3. **New rows blinked in.** Task/routine/note rows and space cards had no entrance (`.task-row`, `.routine-row`, `.idea-row`, `.list-card` — no animation; the only entrance keyframe `rise` belonged to the dead Today-strip CSS).
   → `row-in` entrance (6 px rise + fade, `--t-slow`) on all row types + stat cards, with a capped `nth-child` stagger (first 8 children, 26 ms steps). Because rows are keyed, this plays exactly when a row *mounts*: app-open on Today, tab switches, and each freshly captured task/note slides into place. **Status: ✅**

4. **Checked Today task snapped out after the strike.** fix-2 §8 added the strike, but the row still disappeared in one frame when the DB toggle landed (`TaskListRow.tsx` single 280 ms phase).
   → Three-beat exit: strike (280 ms) → collapse (`max-height`/padding/opacity to 0, 220 ms) → DB toggle commits on an already-invisible row. Reduced-motion: immediate toggle. **Status: ✅**

5. **Checkbox tick was stiff.** `styles.css:115` tick scaled in linearly-ish (0.15 s, no overshoot).
   → Tick pops with `--ease-spring` overshoot; box fill/border cross-fade slightly slower, so the ink visibly "lands". **Status: ✅**

6. **Picker menus (Space/Schedule) popped instantly.** `.picker-menu` (`styles.css:384`) had no animation.
   → `pop-menu`: scale 0.96 + 4 px rise from `transform-origin: bottom left`, `--t-fast`. **Status: ✅**

7. **Tab switch was a hard swap.** `.tab.active` border-bottom jumped between tabs (`styles.css:482`); tasks↔notes content teleported.
   → Sliding ink underline (one absolutely-positioned bar, `translateX` between halves, `--t`) + tab content containers keyed by tab so rows re-run the `row-in` stagger — the list *arrives* instead of swapping. **Status: ✅**

8. **FAB blinked across panes.** `display:none` toggle per pane (`styles.css:736`) = instant appear on pane change.
   → `fab-in` spring pop (scale 0.5→1 + fade) each time a pane's FAB becomes active. **Status: ✅**

9. **Pager dots only scaled.** `styles.css:753` active dot = `scale(1.25)`.
   → Active dot morphs into an 18 px ink **pill** (`width` + `border-radius` transition) — reads as "you are here", not just "bigger". **Status: ✅**

10. **Keyboard lift teleported sheets.** `--kb-inset` margin applied with no transition (`styles.css:263`).
    → `margin-bottom` transitions at `--t` so the sheet glides above the keyboard. **Status: ✅**

11. **Segmented Task|Note toggle had no motion.** Active state swapped backgrounds per button (`styles.css:373`).
    → Equal-width segments + a sliding ink **thumb** (`::before`, `translateX` at `--t`, spring) driven by `data-type` on the group. **Status: ✅**

12. **Long-press had zero feedback.** Rows gave no hint during the 500 ms hold.
    → All pressable rows/cards compress to `scale(0.98)` on `:active` (150 ms) — doubles as tap feedback and hold affordance. **Status: ✅**

---

## 2. Legibility & hierarchy

13. **Water label unreadable at the fill boundary / invisible droplet in light.** One label with a hard-coded white droplet + text-shadow (`styles.css:806-814`): at 0 ml in light mode the white droplet sat on a white card; mid-fill, ink text crossed the blue edge.
    → **Two-layer label**: base label in ink (no shadow), white copy clipped to the fill width (`clip-path: inset(0 calc(100% - var(--fill)) 0 0)`), `--fill` set inline by `WaterMeter`. Text is paper-white *on* the water and ink *off* it, at every fill level, both themes. **Status: ✅**

14. **Goal-met moment passed silently.** Nothing changed when the day's water goal was reached.
    → `met` class on the fill: opacity lifts to 1 + a single soft pulse when it flips. **Status: ✅**

15. **Today had no temporal context** for an app whose whole model is "today" (`TodayScreen.tsx:68` bare `<h1>`).
    → Muted date line under the title (`Tue · Jul 15` style, `.screen-sub`), h1 text untouched (nav e2e pins it). **Status: ✅**

16. **Pane titles slightly under-weighted** vs. the content they command (24 px, `styles.css:458`).
    → 26 px, same tracking; hero streak number gets `--flame`-warm treatment only via existing flame icon (no new colors). **Status: ✅**

17. **Empty states were bare strings** (`.empty-hint`, `.routines-empty`).
    → Centered, roomier, consistent faint tone; routines empty keeps its inline position (it sits inside a labeled section). Copy unchanged. **Status: ✅**

---

## 3. Dead weight (removed)

18. **Legacy Today-strip CSS** — `.today`, `.today-list`, `.today-row`, `.today-title`, `.today-due`, `.today-listname` + the `rise` keyframe: no `.tsx` references (grep-verified; the strip died in the 2.0 pager rework). Removed ~40 lines. `.today-row` also pruned from the reduced-motion and user-select blocks. **Status: ✅**
19. **`.placeholder`, `.idea-space`, `.home-header`, `.wordmark*`** — unreferenced (the wordmark's `Logo.tsx` is itself unimported; component file left alone, CSS pruned). **Status: ✅**

---

## Follow-up (user device report, 2026-07-15 evening)

20. **Edit sheet unusable under the iOS keyboard.** With the keyboard up, a tall sheet (multi-line title) was pushed past the top of the screen — the focused title field invisible — and a dead gap opened between Save and the keys (safe-area padding doubling under the raised sheet). Root cause: `.sheet-panel` had no height cap and its bottom padding always included `env(safe-area-inset-bottom)`.
    → `max-height: calc(100dvh − --kb-inset − safe-top)` + `overflow-y:auto` (sheet scrolls inside; title always reachable), and the safe-area share of the padding is subtracted while the keyboard is up. Verified by simulating a 336 px inset: panel top 16 px, bottom flush above the keys. The `∧∨✓` assistant pill on contenteditable is iOS-owned — not reliably removable.
21. **`#/capture` deep link + manifest shortcut** ("add button on the home screen"): true iOS widgets are native-only, but the app now opens straight into capture from any launcher URL; Android/desktop get a long-press "New task" icon shortcut.

## Verified-clean during the scan (no action)

- Long-title clamp (2-line ellipsis) working in every row context, both themes.
- Overdue treatment (left rule + chip) reads clearly in both themes.
- Custom checkbox, flame glyph, dots-row, heatmap opacities — all on-system.
- Contrast: `--muted` on `--surface` passes AA in both themes (checked the new date line + water base label too).
- The off-center capture-sheet in one *before* shot was a screenshot-script artifact (hash-remount + force-click); reproduced clean from a fresh load — sheets center correctly.

## Change-map

| File | Items |
|---|---|
| `src/styles.css` | tokens, 1–14, 16–17, prune 18–19 |
| `src/components/Sheet.tsx` | 1 (`useSheetDismiss`, `closing` prop, `className`) |
| `src/components/TaskEditSheet.tsx` / `RoutineEditorSheet.tsx` / `ListEditorSheet.tsx` / `WaterGoalSheet.tsx` / `CaptureSheet.tsx` | 1 (dismiss wiring; Capture also 11 + moves onto `Sheet`) |
| `src/screens/TodayScreen.tsx` / `ListScreen.tsx` / `IdeaScreen.tsx` / `SettingsScreen.tsx` | 1 (confirm sheets), 7 (tab ink + keyed content), 15 (date line) |
| `src/components/Toast.tsx` | 2 |
| `src/components/TaskListRow.tsx` | 4 |
| `src/components/WaterMeter.tsx` | 13, 14 |

## Verification

- `npm run verify` — tsc · eslint · vitest · Playwright (webkit + chromium) all green after the pass.
- Before/after screenshots (dark + light, all seven screens) — see scratchpad `design/`.
- Reduced-motion: every new animation inside the `prefers-reduced-motion` block; sequenced JS delays (sheet dismiss, Today check-out) short-circuit via `matchMedia`.
- ⚠️ Feel of touch interactions (press compress, drag, keyboard glide) needs a device pass — same caveat as every iOS item.
