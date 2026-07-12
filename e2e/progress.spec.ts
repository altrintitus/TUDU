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
  await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tudu = (window as never as { __tudu: any }).__tudu;
    const iso = (off: number) => {
      const d = new Date(Date.now() + off * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    // routine 'Meditate' completed the last 3 days (incl. today) → streak 3
    await tudu.db.routines.add({ id: 'r1', title: 'Meditate', days: [0, 1, 2, 3, 4, 5, 6], sortOrder: 1, createdAt: Date.now() });
    for (const off of [-2, -1, 0]) await tudu.db.routineDone.add({ id: `r1:${iso(off)}`, routineId: 'r1', date: iso(off) });
    // one task completed today, one overdue+open
    await tudu.db.tasks.add({ id: 'tk1', listId: 'inbox', title: 'shipped it', done: true, doneAt: Date.now(), dueDate: iso(0), createdAt: Date.now() });
    await tudu.db.tasks.add({ id: 'tk2', listId: 'inbox', title: 'late thing', done: false, dueDate: iso(-3), createdAt: Date.now() });
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Progress' }).click();
});

test('Progress shows streak, 30-day heatmap, routine flame, task stats', async ({ page }) => {
  const p = page.locator('.progress-screen');
  // hero streak: routine + task active today, -1, -2 → 3
  await expect(p.locator('.hero-streak')).toHaveText('3');
  // heatmap has exactly 30 day cells (blanks excluded)
  await expect(p.locator('.heatmap .hcell:not(.blank)')).toHaveCount(30);
  // routine listed with its streak
  await expect(p.getByText('Meditate')).toBeVisible();
  await expect(p.locator('.routine-streak', { hasText: '3' })).toBeVisible();
  // task stats
  await expect(p.locator('.settings-row', { hasText: 'Done today' }).locator('.settings-value')).toHaveText('1');
  await expect(p.locator('.settings-row', { hasText: 'Overdue' }).locator('.settings-value')).toHaveText('1');
});
