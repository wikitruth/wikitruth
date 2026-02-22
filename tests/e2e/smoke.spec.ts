import { test, expect } from '@playwright/test';

test('loads about page', async ({ page }) => {
  await page.goto('/app/about');
  await expect(page.getByRole('heading', { name: /about wikitruth/i })).toBeVisible();
});

test('loads contact page', async ({ page }) => {
  await page.goto('/app/contact');
  await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
});

test('login user journey redirects to home on success', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false }),
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: { _id: '1', username: 'demo' } }),
    });
  });

  await page.goto('/app/login');
  await page.getByLabel(/username or email/i).fill('demo');
  await page.getByLabel(/^password/i).fill('secret12');
  await page.getByRole('button', { name: /^sign in$/i }).click();

  await expect(page).toHaveURL(/\/app\/?$/);
});
