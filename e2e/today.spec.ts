import { test, expect } from '@playwright/test';

// Lands on the Today pane by default.
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
    const iso = (off: number) => {
      const d = new Date(Date.now() + off * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const work = await tudu.createList('Work', '💼');
    await tudu.createTask(work.id, 'overdue report', iso(-1));
    await tudu.createTask('inbox', 'due today', iso(0));
    await tudu.createTask('inbox', 'future thing', iso(3));
  });
  await page.reload();
});

test('Today groups tasks across spaces with space labels', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Overdue' })).toBeVisible();
  await expect(page.getByText('overdue report')).toBeVisible();
  await expect(page.getByText('due today')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible();
  await expect(page.getByText('future thing')).toBeVisible();
  // each task shows its source space label
  await expect(page.locator('.task-space', { hasText: 'Work' })).toBeVisible();
});

test('checking a task removes it from Today', async ({ page }) => {
  await page.getByRole('checkbox', { name: /due today/i }).click();
  await expect(page.getByText('due today')).toHaveCount(0);
});
