import { test, expect } from '@playwright/test';

test('app works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await context.setOffline(false);
});
