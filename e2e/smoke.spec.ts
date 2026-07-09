import { test, expect } from '@playwright/test';

test('app shell loads with header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kin' })).toBeVisible();
});

test('hash routes render and back returns home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Inbox')).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  await expect(page.getByText('settings')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Inbox')).toBeVisible();
});
