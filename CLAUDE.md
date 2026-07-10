# TUDU

Personal PWA: capture tasks + ideas into lists. iPhone-first via Safari Add to Home Screen; no App Store, no backend, data on-device. **`SPEC.md` is the requirements contract — implement against it exactly; deviations need user approval first.**

**Build proceeds phase-by-phase: see `phases/README.md`** (status table + protocol). User says "Build phase N" → read SPEC.md + that phase file fully, work its checkboxes in order, tick them as you go.

## Stack

Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · hash routing · GitHub Pages via Actions.

## Commands

```
npm run dev       # local dev server
npm run verify    # tsc --noEmit → eslint → vitest → playwright (ALL green before done)
```

Until the app is scaffolded these don't exist yet — phase 1 creates them.

## Working rules

- **Think first**: state assumptions, ask instead of guessing, push back when warranted.
- **Simplicity**: minimum code that solves it; no speculative abstractions. 200 lines that could be 50 → 50.
- **Surgical**: every changed line traces to the ask; don't touch adjacent code.
- **Verified**: evidence, not assertions — `npm run verify` output, screenshot, or command run. Nothing ships unverified.
- Plan mode for multi-file work; dispatch the `reviewer` agent on the diff before committing features.
- v1 scope is closed: no notifications, sync, tags, repeat, subtasks, markdown, search (SPEC "Out of scope").

## Hooks (`.claude/settings.json`)

- `auto-lint-test` — tsc + eslint after every source edit; failures come back to you, fix before moving on.
- `stop-on-repeat-failure` — 2 consecutive check failures blocks the stop: reassess, don't retry the same fix.
- `protect-paths` — blocks rm -rf outside project/tmp, `git push --force` (use `--force-with-lease`), SQL DROPs. Safety net, not a sandbox.

## iOS PWA gotchas

See SPEC.md "PWA & iOS requirements" — dvh not vh, safe-area insets, ≥16px inputs, no beforeinstallprompt on iOS, IndexedDB fails in private mode.

## Applied Learning

When something fails repeatedly or a workaround is found, add a one-line bullet here. Keep each under 15 words. No explanations. Only things that save time in future sessions.

- react 19: install `@types/react`, `@types/react-dom`, `@types/node` explicitly
- eslint flat config: `scripts/*.mjs` needs node globals block (Buffer, console)
- e2e back-button: change hash in-app; `goto('#/x')` then `goBack` exits app
- StrictMode double-runs mount effects; `ensureInbox` swallows ConstraintError
- Playwright `getByText` is substring; use `getByRole('heading')` for exact
- Playwright `.check()` on a self-removing checkbox races detach — use `.click()`
- `input[type=date]` exposes role=textbox; disambiguate `getByRole('textbox',{name})`
- react-hooks lint bans setState-in-effect & ref reads in render; use lazy useState init
- async save handlers need a re-entry ref guard (double-tap/Enter-repeat = dupes)
- long-press ends in a ghost click on inner button; swallow via firedRef + onPointerDownCapture reset
- controlled checkbox from async Dexie source: `.check()` races the write; use `.click()`
- keep open+done tasks in one container so toggling repositions the checkbox node (no remount)
- webkit e2e: goto that only ADDS a #fragment won't fire hashchange; set `location.hash` via evaluate
- webkit anchor download: append `<a>` to DOM + delay `revokeObjectURL` (~1s), else no download
- native share() hangs under automation; gate share path on `!navigator.webdriver`
- toast text must not substring-match seeded list/task names (e2e getByText collisions)
- dev SW can't cache vite's unbundled modules; test offline against `vite preview` prod build
- gate Pages base on `!TEST_BUILD` so preview/e2e serve at `/`; set TEST_BUILD on build AND preview
