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

test('capture a task into Inbox (the only space on a fresh app)', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('textbox', { name: 'Capture text' }).fill('finish report');
  await page.getByRole('button', { name: /save/i }).click();
  // fresh app has no real spaces yet → falls back to Inbox
  await page.evaluate(() => { window.location.hash = '#/list/inbox'; });
  await expect(page.getByText('finish report')).toBeVisible();
});

test('schedule chip sets a due date via the Today quick option', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('textbox', { name: 'Capture text' }).fill('call plumber');
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  // chip now reflects the chosen date
  await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toContainText('Today');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByRole('textbox', { name: 'Capture text' })).toHaveCount(0);
});

test('capture an idea into a chosen space; sheet remembers it', async ({ page }) => {
  await page.getByRole('button', { name: /new space/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();

  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('button', { name: /idea/i }).click();
  // custom space picker: open it and choose Work
  await page.getByRole('button', { name: 'Space', exact: true }).click();
  await page.getByRole('option', { name: /Work/ }).click();
  await page.getByRole('textbox', { name: 'Capture text' }).fill('agent eval harness');
  await page.getByRole('button', { name: /save/i }).click();

  // reopen: defaults remembered (type=idea, space=Work on the chip)
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /idea/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Space', exact: true })).toContainText('Work');
});

test('the None schedule option creates a task with no due date', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('textbox', { name: 'Capture text' }).fill('someday task');
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: 'None', exact: true }).click();
  await page.getByRole('button', { name: /save/i }).click();
  // a no-date task lands under the "No date" group on Today (not "Today")
  await page.getByRole('tab', { name: 'Today' }).click();
  const today = page.locator('.today-screen');
  await expect(today.getByRole('heading', { name: 'No date' })).toBeVisible();
  await expect(today.getByText('someday task')).toBeVisible();
});

test('save disabled on empty text; dismiss writes nothing', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();
  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(page.getByRole('textbox', { name: 'Capture text' })).toHaveCount(0);
});
