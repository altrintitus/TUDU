# Phase 8 — Deploy + README

**Goal:** Live on GitHub Pages, CI runs verify on every push, README lets a stranger install Kin on their iPhone.

**Prerequisite:** Phase 7 done. **Repo must be named `Kin`** — production base path is `/Kin/` (vite.config.ts); different name ⇒ change `base` first.

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`
- Modify: none

---

### Task 1: GitHub repo

- [ ] **Step 1:** `gh auth status` (login if needed) → create + push:

```bash
gh repo create Kin --public --source=. --push
```

- [ ] **Step 2:** Enable Pages via Actions builds:

```bash
gh api repos/{owner}/Kin/pages -X POST -f build_type=workflow || \
gh api repos/{owner}/Kin/pages -X PUT -f build_type=workflow
```

(`{owner}` literal works with gh's placeholder substitution.)

### Task 2: CI workflow

- [ ] **`.github/workflows/deploy.yml`** — exact content:

```yaml
name: verify-and-deploy

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps webkit chromium
      - run: npm run verify

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: verify
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] Push → watch `gh run watch` → both jobs green → note the live URL (`https://<user>.github.io/Kin/`).

### Task 3: README.md

- [ ] Write `README.md` — required sections (adapt copy, keep substance):

```markdown
# Kin

Capture tasks and ideas into lists. A tiny local-first PWA — no account, no
server, your data never leaves your device.

[screenshot]

**Use it:** https://<user>.github.io/Kin/

## Install on iPhone
1. Open the link above in Safari.
2. Tap Share → **Add to Home Screen**.
3. Open Kin from your home screen — it works offline from now on.

(Android/desktop: Chrome will offer "Install app" in the address bar.)

## What it does
- Lists hold both **tasks** (checkbox + optional due date) and **ideas** (free-form notes)
- **Today** view collects due + overdue tasks across all lists
- 3-second capture sheet with smart defaults
- JSON export/import backup (Settings)
- Offline-first; installable; dark/light follows your system

## What it deliberately doesn't do
Notifications, sync, accounts, tags, repeats — see SPEC.md for scope.

## Local development
​```bash
npm install
npm run dev        # dev server
npm run verify     # typecheck + lint + unit + e2e
​```

## Privacy
Everything is stored in your browser's IndexedDB. Export backups from Settings.

MIT — see LICENSE.
```

- [ ] Add a real screenshot (iPhone-width) to `docs/screenshot.png` and reference it.
- [ ] Commit + push — `git add -A && git commit -m "docs: README + Pages deploy workflow" && git push`

### Task 4: On-device acceptance (the final manual check)

- [ ] Open live URL in iPhone Safari → install hint appears → Add to Home Screen.
- [ ] Launch from home screen: standalone (no Safari chrome), dark theme, safe-areas correct.
- [ ] Capture a task due today + an idea → force-quit → relaunch in **airplane mode** → data present, app fully functional.
- [ ] Settings → export → share sheet saves to Files.
- [ ] Second device/friend test (optional): fresh phone installs from the URL and works.
- [ ] Update `phases/README.md` status table → all 8 done. Ship announcement to yourself. 🎉

**Done when:** live URL installable + offline on your physical iPhone · CI green on main.
