import { test, expect } from '@playwright/test';

// fresh origin storage per test
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

test('fresh app shows Inbox only, no Today strip', async ({ page }) => {
  await expect(page.getByText('Inbox')).toBeVisible();
  await expect(page.getByText('Today')).toHaveCount(0);
});

test('create, rename, delete a list', async ({ page }) => {
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Work')).toBeVisible();

  await page.getByRole('button', { name: /edit work/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Deriv');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Deriv')).toBeVisible();
  await expect(page.getByText('Work')).toHaveCount(0);

  await page.getByRole('button', { name: /edit deriv/i }).click();
  await page.getByRole('button', { name: /^delete/i }).click();
  await page.getByRole('button', { name: /confirm|yes/i }).click();
  await expect(page.getByText('Deriv')).toHaveCount(0);
});

test('inbox cannot be deleted', async ({ page }) => {
  await page.getByRole('button', { name: /edit inbox/i }).click();
  await expect(page.getByRole('button', { name: /^delete/i })).toHaveCount(0);
});

test('today strip shows due + overdue across lists, checking removes', async ({ page }) => {
  await page.evaluate(async () => {
    const tudu = (window as never as { __tudu: typeof import('../src/testBridge') & Record<string, CallableFunction> }).__tudu;
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today.getTime() - 86_400_000);
    const work = await tudu.createList('Work');
    await tudu.createTask(work.id, 'overdue report', iso(yesterday));
    await tudu.createTask('inbox', 'due today', iso(today));
    await tudu.createTask('inbox', 'future', '2999-01-01');
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByText('overdue report')).toBeVisible();
  await expect(page.getByText('due today')).toBeVisible();
  await expect(page.getByText('future')).toHaveCount(0);

  // click, not check(): completing the task unmounts the row, so check()'s
  // post-click "is now checked" assertion would race against the detach.
  await page.getByRole('checkbox', { name: /due today/i }).click();
  await expect(page.getByText('due today')).toHaveCount(0);
});
