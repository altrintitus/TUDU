import { test, expect } from '@playwright/test';

// The global capture FAB lives on the Spaces pane — land there each test.
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

const iso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('capture a task into Inbox (the default space)', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  // date input also exposes role=textbox, so target the capture field by its label
  await page.getByRole('textbox', { name: 'Capture text' }).fill('finish report');
  await page.getByLabel(/due/i).fill(iso());
  await page.getByRole('button', { name: /save/i }).click();
  // it lands in the Inbox space
  await page.evaluate(() => { window.location.hash = '#/list/inbox'; });
  await expect(page.getByText('finish report')).toBeVisible();
});

test('capture an idea into a chosen space; sheet remembers it', async ({ page }) => {
  await page.getByRole('button', { name: /new space/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();

  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('button', { name: /idea/i }).click();
  await page.getByLabel('Space', { exact: true }).selectOption({ label: 'Work' });
  await page.getByRole('textbox', { name: 'Capture text' }).fill('agent eval harness');
  await page.getByRole('button', { name: /save/i }).click();

  // reopen: defaults remembered
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /idea/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Space', { exact: true }).locator('option:checked')).toHaveText('Work');
});

test('save disabled on empty text; dismiss writes nothing', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();
  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(page.getByRole('textbox', { name: 'Capture text' })).toHaveCount(0);
});
