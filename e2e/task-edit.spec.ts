import { test, expect } from '@playwright/test';

// Seed one Today task (in Inbox) plus a Work space, then land on Today.
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
  await page.evaluate(async () => {
    const tudu = (window as never as { __tudu: Record<string, CallableFunction> }).__tudu;
    await tudu.createList('Work', '💼');
    await tudu.createTask('inbox', 'draft report'); // dueDate defaults to today
  });
  await page.reload();
});

test('edit the title from the sheet', async ({ page }) => {
  await page.getByText('draft report').click();
  await expect(page.getByRole('dialog', { name: /edit task/i })).toBeVisible();
  await page.getByRole('textbox', { name: /title/i }).fill('draft Q3 report');
  await page.getByRole('button', { name: /save/i }).click();
  // scope to the row title: the sheet's contenteditable Title field would also
  // match a bare getByText while the sheet is closing.
  await expect(page.locator('.task-title', { hasText: 'draft Q3 report' })).toBeVisible();
});

test('reassign the task to another space', async ({ page }) => {
  await page.getByText('draft report').click();
  await page.getByRole('button', { name: 'Space', exact: true }).click();
  await page.getByRole('option', { name: /Work/ }).click();
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.locator('.task-space', { hasText: 'Work' })).toBeVisible();
});

test('clear the due date via the None option → task moves to No date', async ({ page }) => {
  await page.getByText('draft report').click();
  await page.getByRole('button', { name: /schedule/i }).click();
  await page.getByRole('button', { name: 'None', exact: true }).click();
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByRole('heading', { name: 'No date' })).toBeVisible();
});

test('delete the task from the editor', async ({ page }) => {
  await page.getByText('draft report').click();
  await page.getByRole('button', { name: /^delete/i }).click();
  await page.getByRole('button', { name: /confirm/i }).click();
  await expect(page.locator('.task-title', { hasText: 'draft report' })).toHaveCount(0);
});
