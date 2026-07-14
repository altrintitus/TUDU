import { test, expect } from '@playwright/test';

// Lands on Today, where the water meter lives. Fresh origin storage per test.
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

test('tapping the meter sets today\'s intake; arrow keys nudge by 250 ml', async ({ page }) => {
  // both the Today and Progress water meters are mounted (pager) — scope to Today
  const slider = page.locator('.today-water').getByRole('slider', { name: /water intake/i });
  // click centre = 50% of the 3.5 L goal → 1.75 L (already a 250 ml multiple)
  await slider.click();
  await expect(slider).toHaveAttribute('aria-valuenow', '1750');

  // one keyboard step = +250 ml
  await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '2000');
  await slider.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuenow', '1750');
});

test('changing the daily goal updates the header and the meter range', async ({ page }) => {
  const goalBtn = page.getByRole('button', { name: /set water goal/i });
  await expect(goalBtn).toContainText('3.5 L'); // default

  await goalBtn.click();
  await page.getByRole('button', { name: '2.5 L', exact: true }).click();

  await expect(goalBtn).toContainText('2.5 L');
  await expect(page.locator('.today-water').getByRole('slider', { name: /water intake/i })).toHaveAttribute('aria-valuemax', '2500');
});
