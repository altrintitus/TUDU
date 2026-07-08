# Kin

Personal PWA: capture tasks + ideas into lists. iPhone-first via Safari Add to Home Screen; no App Store, no backend, data on-device. **`SPEC.md` is the requirements contract — implement against it exactly; deviations need user approval first.**

## Stack

Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · hash routing · GitHub Pages via Actions.

## Commands

```
npm run dev       # local dev server
npm run verify    # tsc --noEmit → eslint → vitest → playwright (ALL green before done)
```

Until the app is scaffolded these don't exist yet — scaffolding them per SPEC.md is Exec's first task.

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
