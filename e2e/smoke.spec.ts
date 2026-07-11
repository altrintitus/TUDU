import { test, expect } from '@playwright/test';

test('app shell loads with header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('hash routes render and back returns home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});
