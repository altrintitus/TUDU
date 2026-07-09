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

const iso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('capture a task due today → appears in Today strip', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  // date input also exposes role=textbox, so target the capture field by its label
  await page.getByRole('textbox', { name: 'Capture text' }).fill('finish report');
  await page.getByLabel(/due/i).fill(iso());
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByText('finish report')).toBeVisible();
});

test('capture an idea into a chosen list; sheet remembers it', async ({ page }) => {
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();

  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('button', { name: /idea/i }).click();
  await page.getByLabel(/list/i).selectOption({ label: 'Work' });
  await page.getByRole('textbox', { name: 'Capture text' }).fill('agent eval harness');
  await page.getByRole('button', { name: /save/i }).click();

  // reopen: defaults remembered
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /idea/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel(/list/i).locator('option:checked')).toHaveText('Work');
});

test('save disabled on empty text; dismiss writes nothing', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();
  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(page.getByText('Today')).toHaveCount(0);
});
