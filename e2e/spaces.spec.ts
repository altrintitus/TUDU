import { test, expect } from '@playwright/test';

// fresh origin storage per test, then land on the Spaces pane
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
  await page.getByRole('tab', { name: 'Spaces' }).click();
});

test('fresh app: empty Spaces (Inbox hidden)', async ({ page }) => {
  await expect(page.getByRole('button', { name: /new space/i })).toBeVisible();
  await expect(page.getByText('Inbox')).toHaveCount(0); // Inbox hidden while empty
});

test('create, rename, delete a space', async ({ page }) => {
  await page.getByRole('button', { name: /new space/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();
  // scope to the card name: the sheet's contenteditable Name field would also
  // match a bare getByText while it's mounted.
  await expect(page.locator('.list-card-name', { hasText: 'Work' })).toBeVisible();

  await page.getByRole('button', { name: /edit work/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Deriv');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.locator('.list-card-name', { hasText: 'Deriv' })).toBeVisible();
  await expect(page.locator('.list-card-name', { hasText: 'Work' })).toHaveCount(0);

  await page.getByRole('button', { name: /edit deriv/i }).click();
  await page.getByRole('button', { name: /^delete/i }).click();
  await page.getByRole('button', { name: /confirm|yes/i }).click();
  await expect(page.locator('.list-card-name', { hasText: 'Deriv' })).toHaveCount(0);
});

test('inbox stays hidden from Spaces after adding a space', async ({ page }) => {
  await page.getByRole('button', { name: /new space/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.locator('.list-card-name', { hasText: 'Work' })).toBeVisible();
  await expect(page.getByText('Inbox')).toHaveCount(0);
});
