import { test, expect } from '@playwright/test';

// Lands on the Today pane, where routines live.
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

test('create a routine → shows on Today → check → streak 1', async ({ page }) => {
  await page.getByRole('button', { name: /add routine/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Meditate');
  await page.getByRole('button', { name: /save/i }).click();

  // Meditate also renders on the Progress pane (both mounted) — scope to Today.
  const today = page.locator('.today-screen');
  // scope to the routine title span: the editor's contenteditable Name field
  // would also match a bare getByText('Meditate') while the sheet is closing.
  await expect(today.locator('.routine-title', { hasText: 'Meditate' })).toBeVisible();
  await expect(today.locator('.routine-streak')).toHaveText('0'); // flame is an svg; text is the count

  await page.getByRole('checkbox', { name: /meditate/i }).click();
  await expect(today.locator('.routine-streak')).toHaveText('1');
});
