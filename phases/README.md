# Kin — Phased Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement a phase task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Kin (SPEC.md) in 8 sequential phases, each independently buildable and verifiable.

**Architecture:** Local-first PWA. Dexie (IndexedDB) is the single store; React components read it reactively via `dexie-react-hooks` `useLiveQuery` — no state library, no context providers for data. A ~30-line `useHashRoute` hook replaces a router dep. Pure logic lives in `src/logic/` and is unit-tested; UI behavior is pinned by Playwright e2e specs (iPhone profile).

**Tech Stack:** Vite + React + TypeScript · Dexie + dexie-react-hooks · vite-plugin-pwa · Vitest (+ fake-indexeddb, jsdom) · Playwright (webkit/iPhone 14) · GitHub Pages via Actions.

---

## Status

| Phase | Title | Status |
|---|---|---|
| 1 | [Scaffold + verify harness](phase-1-scaffold.md) | **done** |
| 2 | [Data layer](phase-2-data-layer.md) | **done** |
| 3 | [Home screen](phase-3-home.md) | **done** |
| 4 | [Capture sheet](phase-4-capture.md) | pending |
| 5 | [List view + idea editor](phase-5-list-view.md) | pending |
| 6 | [Settings: export/import](phase-6-settings.md) | pending |
| 7 | [PWA + iOS polish](phase-7-pwa-polish.md) | pending |
| 8 | [Deploy + README](phase-8-deploy.md) | pending |

Update this table (pending → **done (commit sha)**) when a phase lands.

## Protocol (every phase)

1. Fresh session or `/clear` → prompt: **"Build phase N"**.
2. Read `SPEC.md` + the phase file fully before touching code. Phase files are self-contained but SPEC.md stays the requirements contract — on conflict, stop and ask the user, then update SPEC first.
3. Work the checkboxes in order. TDD for logic (test → fail → implement → pass). Tick boxes in the phase file as you go.
4. End of phase: `npm run verify` must be green (phase 1 creates it). Evidence, not assertions.
5. Dispatch the `reviewer` agent on the diff; fix correctness/SPEC findings.
6. Commit (conventional format, e.g. `feat(home): lists CRUD + today strip`), update the Status table above.
7. New gotcha discovered → one-line bullet in `CLAUDE.md ## Applied Learning`.

## Rules

- **Scope is closed per phase.** Don't build ahead; don't add v1 out-of-scope items (SPEC "Out of scope"): no notifications, sync, tags, repeat, subtasks, priorities, markdown, search.
- **UI internals are deliberately not pre-written.** Phase files pin: exact file paths, exported contracts (types/signatures/props), behavior checklists, and full e2e specs — the e2e spec IS the acceptance contract. Visual implementation happens at build time; invoke the `frontend-design` skill before writing the first CSS of any new screen.
- **Contracts are frozen.** Later phases import earlier phases' exports by the exact names defined in phase 2 (`db.ts`, `logic/`). Renaming a contract = update the phase file + SPEC first.
- Playwright e2e files accumulate: `e2e/smoke.spec.ts` (P1), `e2e/lists.spec.ts` (P3), `e2e/capture.spec.ts` (P4), `e2e/list-view.spec.ts` (P5), `e2e/backup.spec.ts` (P6), `e2e/offline.spec.ts` (P7). All must stay green in every later phase.
