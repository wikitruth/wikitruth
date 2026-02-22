import { test, expect } from '@playwright/test';

test('loads about page', async ({ page }) => {
  await page.goto('/app/about');
  await expect(page.getByRole('heading', { name: /about wikitruth/i })).toBeVisible();
});

test('loads contact page', async ({ page }) => {
  await page.goto('/app/contact');
  await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
});
