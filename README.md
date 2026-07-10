# TUDU

A personal PWA for capturing **tasks** and **ideas** into **lists**. iPhone-first, installed from Safari via *Add to Home Screen* — no App Store, no backend, no accounts. All data lives **on your device**.

> Local-first: IndexedDB (via Dexie) on-device, JSON export/import for backup. Nothing leaves your phone.

## Features

- **Lists** hold both tasks and ideas; `Inbox` is a permanent default.
- **Today strip** on Home — due + overdue tasks across every list.
- **Tasks** — title, checkbox, optional due date. Done tasks collapse into a `Done (n)` section.
- **Ideas** — plain-text notes; first line becomes the title. Full-screen autosaving editor.
- **Capture** — global `+` bottom sheet with Task/Idea toggle, list chip, and smart defaults.
- Offline after first load (service worker precache); warm monochrome design, dark + light.

## Design

Warm monochrome — ink on paper. Light theme is a cream/ink palette; dark is the same system inverted. Wordmark + iconography are custom SVG; type is [Comfortaa](https://fonts.google.com/specimen/Comfortaa) (OFL, self-hosted for offline).

## Status

Built phase-by-phase (see [`phases/README.md`](phases/README.md)):

| Phase | | |
|---|---|---|
| 1–5 | Scaffold · Data layer · Home · Capture · List view + idea editor | ✅ done |
| 6 | Settings: export/import | pending |
| 7 | PWA + iOS polish | pending |
| 8 | Deploy to GitHub Pages | pending |

## Install on iPhone

*(once deployed to GitHub Pages — phase 8)*

1. Open the app URL in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch from the icon — runs standalone, works in airplane mode after first load.

## Local development

```bash
npm install
npm run dev       # local dev server
npm run verify    # tsc --noEmit → eslint → vitest → playwright (all green before commit)
```

**Stack:** Vite · React · TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · hash routing. Unit tests in Vitest, e2e in Playwright (iPhone profile).

## Privacy

All data stays on your device (IndexedDB). No servers, no accounts, no telemetry. Back up any time via Settings → Export (JSON); restore via Import.

## License

[MIT](LICENSE) © Altrin Titus
