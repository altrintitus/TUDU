# Phase 6 — Settings: export / import

**Goal:** Backup story from SPEC: one-tap JSON export (share sheet / download), import with validation + replace-all confirm, storage status + data counts.

**Prerequisite:** Phase 5 done. Uses `exportData` / `validateBackup` / `importData` from `src/logic/backup.ts` — already unit-tested in phase 2; this phase only builds UI + wiring.

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Modify: `src/App.tsx` (route `settings` → SettingsScreen), `src/screens/HomeScreen.tsx` (⚙︎ affordance in header → `navigate({name:'settings'})`), `src/styles.css`
- Test: `e2e/backup.spec.ts`

---

### Task 1: Behavior checklist

- [ ] Header with back → home. Sections: **Backup**, **Storage**, **About**.
- [ ] **Export**: button → `exportData()` → `JSON.stringify(data, null, 2)` → file `kin-backup-YYYY-MM-DD.json` (name via `todayStr()`).
  - If `navigator.canShare?.({ files })` (iOS): `navigator.share({ files: [new File([json], name, { type: 'application/json' })] })` — lands in iCloud Files / AirDrop.
  - Fallback (desktop, e2e): anchor download via `URL.createObjectURL(new Blob([json], { type: 'application/json' }))`, then `revokeObjectURL`.
- [ ] **Import**: `<input type="file" accept="application/json">` (hidden, triggered by button) → read text → `JSON.parse` in try/catch → `validateBackup`. Invalid → inline error "Not a Kin backup file." Valid → confirm step showing incoming counts ("Replace everything with N lists / M tasks / K ideas?") → `importData` → success toast. Cancel → nothing written.
- [ ] **Storage**: persistent-storage status via `navigator.storage.persisted()` ("Protected" / "Best-effort"); live counts (lists/tasks/ideas via `useLiveQuery`).
- [ ] **About**: app version (`import.meta.env` — inject `define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) }` in `vite.config.ts` + `declare const __APP_VERSION__: string` in `src/vite-env.d.ts`), link to GitHub repo.

### Task 2: e2e — `e2e/backup.spec.ts`

- [ ] **Step 1: Write the spec** (same DB-wipe `beforeEach` block as lists.spec.ts, verbatim, ending with `page.reload()`)

```ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// beforeEach: standard DB wipe block (copy from lists.spec.ts), then:

test('export downloads a valid backup file', async ({ page }) => {
  await page.evaluate(async () => {
    const kin = (window as never as { __kin: Record<string, CallableFunction> }).__kin;
    const w = await kin.createList('Work');
    await kin.createTask(w.id, 'report', '2026-07-10');
  });
  await page.goto('/#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export/i }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^kin-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const body = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(body.version).toBe(1);
  expect(body.lists.map((l: { name: string }) => l.name)).toContain('Work');
  expect(body.tasks[0].title).toBe('report');
});

test('import replaces data after confirm', async ({ page }) => {
  const backup = {
    version: 1, exportedAt: new Date().toISOString(),
    lists: [
      { id: 'inbox', name: 'Inbox', emoji: '📥', sortOrder: 0, createdAt: 1 },
      { id: 'l1', name: 'Restored', sortOrder: 1, createdAt: 2 }
    ],
    tasks: [{ id: 't1', listId: 'l1', title: 'restored task', done: false, createdAt: 3 }],
    ideas: []
  };
  await page.evaluate(async () => {
    const kin = (window as never as { __kin: Record<string, CallableFunction> }).__kin;
    await kin.createTask('inbox', 'doomed task');
  });
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /import/i }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });
  await page.getByRole('button', { name: /replace/i }).click();

  await page.goto('/#/');
  await expect(page.getByText('Restored')).toBeVisible();
  await page.getByText('Restored').click();
  await expect(page.getByText('restored task')).toBeVisible();
  await page.goto('/#/list/inbox');
  await expect(page.getByText('doomed task')).toHaveCount(0);
});

test('invalid file shows error, writes nothing', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /import/i }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'junk.json', mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}')
  });
  await expect(page.getByText(/not a kin backup/i)).toBeVisible();
});
```

Note: e2e runs on the anchor-download path (test webkit has no `navigator.canShare` with files). The share path gets the phase-8 on-device manual check.

- [ ] **Step 2: Build until spec passes** — `npx playwright test e2e/backup.spec.ts`
- [ ] **Step 3: `npm run verify` green**
- [ ] **Step 4: Reviewer agent on the diff, fix findings**
- [ ] **Step 5: Commit** — `git commit -am "feat(settings): backup export/import, storage status"`

**Done when:** e2e green · export→wipe→import roundtrip works by hand in a desktop browser too.
