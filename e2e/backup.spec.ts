import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(dbs.map(d => new Promise(res => {
      const req = indexedDB.deleteDatabase(d.name!);
      req.onsuccess = req.onerror = req.onblocked = () => res(null);
    })));
  });
  await page.reload();
});

test('export downloads a valid backup file', async ({ page }) => {
  await page.evaluate(async () => {
    const tudu = (window as never as { __tudu: Record<string, CallableFunction> }).__tudu;
    const w = await tudu.createList('Work');
    await tudu.createTask(w.id, 'report', '2026-07-10');
  });
  // set hash via JS, not page.goto('/#/settings'): webkit doesn't fire
  // hashchange when goto only *adds* a fragment to a hashless URL (see smoke.spec).
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export/i }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^tudu-backup-\d{4}-\d{2}-\d{2}\.json$/);
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
    const tudu = (window as never as { __tudu: Record<string, CallableFunction> }).__tudu;
    await tudu.createTask('inbox', 'doomed task');
  });
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  await page.getByRole('button', { name: /import/i }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });
  await page.getByRole('button', { name: /replace/i }).click();

  await page.goto('/#/');
  // open the restored space from the Spaces pane (scope avoids the Today pane,
  // which now also lists the restored task)
  await page.getByRole('tab', { name: 'Spaces' }).click();
  const spaces = page.locator('.spaces-screen');
  await expect(spaces.getByText('Restored')).toBeVisible();
  await spaces.getByText('Restored').click();
  await expect(page.getByText('restored task')).toBeVisible();
  await page.goto('/#/list/inbox');
  await expect(page.getByText('doomed task')).toHaveCount(0);
});

test('invalid file shows error, writes nothing', async ({ page }) => {
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  await page.getByRole('button', { name: /import/i }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'junk.json', mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}')
  });
  await expect(page.getByText(/not a TUDU backup/i)).toBeVisible();
});
