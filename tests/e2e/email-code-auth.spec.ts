import { expect, test } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

async function disableConditionalPasskeys(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    if (typeof PublicKeyCredential === 'undefined') return;
    Object.defineProperty(PublicKeyCredential, 'isConditionalMediationAvailable', {
      configurable: true,
      value: async () => false,
    });
  });
}

async function requestDevelopmentCode(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel('Email *', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click();
  await expect(page.getByLabel('Six-digit code *', { exact: true })).toBeVisible();
  const code = (await page.locator('.wt-email-auth-panel .help-block strong').innerText()).trim();
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel('Six-digit code *', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Verify and continue' }).click();
}

test.describe('email-code authentication', () => {
  test.skip(process.env.EMAIL_AUTH_E2E !== '1', 'Use the local disposable email-auth runner.');
  test.skip(({ browserName }) => browserName !== 'chromium', 'The local tenant host rule is Chromium-only.');

  test('keeps tenant auth branded and returns through the canonical identity service', async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await disableConditionalPasskeys(page);
    await page.goto('https://fixthephilippines.org:9443/login');

    await expect(page.locator('body')).toHaveAttribute('data-application', 'fixtheph');
    const continueLink = page.getByRole('link', { name: 'Continue with email on Wikitruth' });
    await expect(continueLink).toBeVisible();
    const destination = new URL(String(await continueLink.getAttribute('href')));
    const canonicalAuthOrigin = String(process.env.EMAIL_AUTH_CANONICAL_ORIGIN || '');
    expect(canonicalAuthOrigin).toBeTruthy();
    expect(destination.origin).toBe(canonicalAuthOrigin);
    expect(destination.pathname).toBe('/login');
    expect(destination.searchParams.get('targetOrigin')).toBe('https://fixthephilippines.org:9443');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await context.close();
  });

  test('creates and returns to a passwordless account with fixed session lifetimes', async ({ page }) => {
    test.setTimeout(60_000);
    const username = String(process.env.EMAIL_AUTH_E2E_USERNAME || '');
    const email = String(process.env.EMAIL_AUTH_E2E_EMAIL || '');
    expect(username).toBeTruthy();
    expect(email).toBeTruthy();
    await disableConditionalPasskeys(page);

    await page.goto('/login');
    await expect(page.getByRole('checkbox', { name: 'Keep me signed in on this device for 30 days' })).toBeChecked();
    await requestDevelopmentCode(page, email);
    await expect(page.getByLabel('Username *', { exact: true })).toBeVisible();
    await page.getByLabel('Username *', { exact: true }).fill(username);
    await page.getByRole('checkbox', { name: 'I agree to the terms and responsible participation rules' }).check();
    await page.getByRole('button', { name: 'Create account and continue' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: `Account menu for ${username}` })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: `Account menu for ${username}` })).toBeVisible();
    await page.goto('/account/settings#sessions');
    const rememberedPanel = page.locator('#sessions');
    await expect(rememberedPanel).toContainText('Email code');
    await expect(rememberedPanel).toContainText('Current session');
    await expect(rememberedPanel).toContainText('Remembered');

    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: `Account menu for ${username}` })).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Keep me signed in on this device for 30 days' }).uncheck();
    await requestDevelopmentCode(page, email);
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/account/settings#sessions');
    const standardPanel = page.locator('#sessions');
    await expect(standardPanel).toContainText('Email code');
    await expect(standardPanel).not.toContainText('Remembered');
  });
});
