import { test, expect } from '@playwright/test';

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

test('three pages present; dots select', async ({ page }) => {
  // all three panes are mounted side-by-side in the scroll track
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spaces' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  // the Spaces pane carries the New space affordance
  await page.getByRole('tab', { name: 'Spaces' }).click();
  await expect(page.getByRole('button', { name: /new space/i })).toBeVisible();
});
