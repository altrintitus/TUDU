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
    await tudu.createTask('inbox', 'buy milk');
    await tudu.createIdea('inbox', 'app idea\nlonger body text');
  });
  await page.reload();
  // Inbox is hidden from the home list, so open it directly by hash.
  await page.evaluate(() => { window.location.hash = '#/list/inbox'; });
});

test('check task → moves to collapsed Done; uncheck restores', async ({ page }) => {
  // click(), not check(): the checkbox is controlled by an async Dexie write, so
  // check()'s immediate "is checked" assertion races the DB round-trip (CLAUDE.md).
  await page.getByRole('checkbox', { name: /buy milk/i }).click();
  await expect(page.getByText(/done \(1\)/i)).toBeVisible();
  await expect(page.getByText('buy milk')).toBeHidden(); // collapsed

  await page.getByText(/done \(1\)/i).click();
  await page.getByRole('checkbox', { name: /buy milk/i }).click();
  await expect(page.getByText(/done/i)).toHaveCount(0);
  await expect(page.getByText('buy milk')).toBeVisible();
});

test('edit task title and due via sheet', async ({ page }) => {
  await page.getByText('buy milk').click();
  await page.getByRole('textbox', { name: /title/i }).fill('buy oat milk');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('buy oat milk')).toBeVisible();
});

test('ideas tab shows first-line title; editor autosaves across reload', async ({ page }) => {
  await page.getByRole('tab', { name: /ideas/i }).click();
  await expect(page.getByText('app idea')).toBeVisible();
  await expect(page.getByText('longer body text')).toHaveCount(0);

  await page.getByText('app idea').click();
  const editor = page.getByRole('textbox');
  await editor.fill('renamed idea\nnew body');
  await page.waitForTimeout(700); // > debounce
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue('renamed idea\nnew body');

  await page.getByRole('button', { name: /back/i }).click();
  await expect(page.getByText('renamed idea')).toBeVisible();
});

test('per-list add captures directly into this list', async ({ page }) => {
  await page.getByRole('tab', { name: /tasks/i }).click();
  await page.getByRole('button', { name: /add to inbox/i }).click();
  await expect(page.getByLabel(/list/i)).toHaveCount(0); // chip hidden
  // Task capture also renders the due-date field, which webkit exposes as a
  // second textbox — target the capture field by name (see capture.spec.ts).
  await page.getByRole('textbox', { name: 'Capture text' }).fill('from inside list');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('from inside list')).toBeVisible();
});

test('garbage list id redirects home', async ({ page }) => {
  await page.goto('/#/list/does-not-exist');
  await expect(page.getByRole('button', { name: /new list/i })).toBeVisible(); // home
});
