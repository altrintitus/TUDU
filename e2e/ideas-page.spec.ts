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
    const tudu = (window as never as { __tudu: Record<string, CallableFunction> }).__tudu;
    const work = await tudu.createList('Work', '💼');
    await tudu.createIdea(work.id, 'weekly digest email');
    await tudu.createIdea('inbox', 'keyboard-first navigation');
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Ideas' }).click();
});

test('Ideas page aggregates ideas across spaces with space labels', async ({ page }) => {
  const ideas = page.locator('.ideas-screen');
  await expect(ideas.getByText('weekly digest email')).toBeVisible();
  await expect(ideas.getByText('keyboard-first navigation')).toBeVisible();
  await expect(ideas.locator('.idea-space', { hasText: 'Work' })).toBeVisible();
  await expect(ideas.locator('.idea-space', { hasText: 'Inbox' })).toBeVisible();
});

test('tapping an idea opens its editor', async ({ page }) => {
  await page.locator('.ideas-screen').getByText('weekly digest email').click();
  await expect(page.getByRole('textbox', { name: /idea text/i })).toHaveValue(/weekly digest email/);
});
