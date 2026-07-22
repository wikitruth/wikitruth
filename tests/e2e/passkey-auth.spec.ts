import { expect, test } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

test.describe('passkey authentication', () => {
  test.skip(process.env.PASSKEY_E2E !== '1', 'Set PASSKEY_E2E=1 against a disposable local database.');
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP virtual authenticators require Chromium.');

  test('signs up, adds recovery protections, logs out, and signs in without a password', async ({ page, context }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      Object.defineProperty(PublicKeyCredential, 'isConditionalMediationAvailable', {
        configurable: true,
        value: async () => false,
      });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId: primaryAuthenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        ctap2Version: 'ctap2_1',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const username = `passkey-e2e-${suffix}`;
    const email = `${username}@example.test`;

    await page.goto('/signup');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/I agree to the terms/i).check();
    await page.getByRole('button', { name: /create account with a passkey/i }).click();
    await expect(page).toHaveURL(/\/account\/settings#passkeys/);
    await expect(page.getByLabel('Passkey name').nth(1)).toHaveValue('Primary passkey');

    await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId: primaryAuthenticatorId });
    const { authenticatorId: backupAuthenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        ctap2Version: 'ctap2_1',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    await page.locator('#new-passkey-name').fill('Backup passkey');
    await page.getByRole('button', { name: /add passkey/i }).click();
    await expect(page.getByLabel('Passkey name').nth(2)).toHaveValue('Backup passkey');

    await page.getByRole('button', { name: /generate new recovery codes/i }).click();
    await expect(page.getByText(/will not be shown again/i)).toBeVisible();
    await expect(page.locator('pre')).toContainText('WT-');

    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('button', { name: /sign in with a passkey/i }).click();
    await expect(page).toHaveURL(/\/$/);

    const me = await page.request.get('/api/auth/me');
    expect(me.ok()).toBeTruthy();
    await expect(me.json()).resolves.toEqual(expect.objectContaining({
      user: expect.objectContaining({ username }),
      assurance: expect.objectContaining({ method: 'passkey' }),
    }));

    await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId: backupAuthenticatorId });
  });
});
