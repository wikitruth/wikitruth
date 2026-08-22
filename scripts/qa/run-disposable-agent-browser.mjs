#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';
import { chromium } from 'playwright';
import {
  assertLocalPilotTargets,
  insertPilotIdentity,
  pilotStamp,
} from './epistemic-pilot-support.mjs';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || process.env.WT_AGENT_BROWSER_BASE_URL || 'https://127.0.0.1:9443';
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `agent-browser-disposable-${runDate}`);
const browserChannel = process.env.WT_AGENT_BROWSER_CHANNEL || 'chrome';
const headless = !['0', 'false', 'no'].includes(String(process.env.WT_AGENT_BROWSER_HEADLESS || 'true').toLowerCase());

async function login(page, identity) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  const usernameField = page.getByLabel('Username or Email');
  const passwordToggle = page.getByRole('button', { name: 'Use password instead' });
  const needsPasswordToggle = await Promise.race([
    usernameField.waitFor().then(() => false),
    passwordToggle.waitFor().then(() => true),
  ]);
  if (needsPasswordToggle) await passwordToggle.click();
  await usernameField.fill(identity.username);
  await page.getByPlaceholder('Enter your password').fill(identity.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 });
}

async function bearerIdentity(context, token) {
  const response = await context.request.get(`${baseUrl}/api/v1/agent/identity`, {
    headers: { Authorization: `Bearer ${token}`, 'Accept-Version': '1' },
    failOnStatusCode: false,
    timeout: 30_000,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  return { status: response.status(), payload };
}

async function grantDisposablePasskeyAssurance(connection, identity) {
  const session = await connection.collection('sessions').findOne({
    session: { $regex: String(identity.userId) },
  });
  assert.ok(session?._id && session.session, 'Authenticated admin session was not persisted');
  const now = new Date().toISOString();
  const sessionValue = JSON.parse(session.session);
  sessionValue.authentication = {
    method: 'passkey', authenticatedAt: now, passkeyVerifiedAt: now,
    passkeyCredentialId: `qa-${pilotStamp()}`,
  };
  await connection.collection('sessions').updateOne(
    { _id: session._id },
    { $set: { session: JSON.stringify(sessionValue), expires: new Date(Date.now() + 60 * 60 * 1000) } },
  );
  await connection.collection('passkeycredentials').insertMany([0, 1].map((index) => ({
    _id: new mongoose.Types.ObjectId(), userId: identity.userId,
    credentialId: `qa-${pilotStamp()}-${index}`, status: 'active',
    rpId: '127.0.0.1', createDate: new Date(), editDate: new Date(),
  })));
}

async function cleanup(connection, identities) {
  const userIds = identities.map((identity) => identity.userId);
  const accountIds = identities.map((identity) => identity.accountId);
  const adminIds = identities.map((identity) => identity.adminId).filter(Boolean);
  const sessionPattern = userIds.map(String).join('|');
  const queries = {
    apiclients: { userId: { $in: userIds } },
    passkeycredentials: { userId: { $in: userIds } },
    sessions: { session: { $regex: sessionPattern } },
    users: { _id: { $in: userIds } },
    accounts: { _id: { $in: accountIds } },
    admins: { _id: { $in: adminIds } },
  };
  for (const [collection, query] of Object.entries(queries)) {
    await connection.collection(collection).deleteMany(query);
  }
  const residue = {};
  for (const [collection, query] of Object.entries(queries)) {
    residue[collection] = await connection.collection(collection).countDocuments(query);
  }
  return residue;
}

async function main() {
  assertLocalPilotTargets(baseUrl, config.mongodb.uri);
  await fs.mkdir(outDir, { recursive: true });
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  const identities = [];
  const steps = [];
  const consoleErrors = [];
  const environmentWarnings = [];
  let browser = null;
  let browserVersion = '';
  let runError = null;
  let cleanupResidue = null;
  let credentialEvidence = null;

  try {
    const admin = await insertPilotIdentity(connection, 'qa_agent_admin', { admin: true });
    const accountable = await insertPilotIdentity(connection, 'qa_agent_owner');
    identities.push(admin, accountable);
    browser = await chromium.launch({ channel: browserChannel, headless });
    browserVersion = browser.version();
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const detail = { message: message.text(), url: message.location().url || '' };
      if (detail.message === 'An SSL certificate error occurred when fetching the script.') environmentWarnings.push(detail);
      else consoleErrors.push(detail);
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await login(page, admin);
    steps.push('platform-admin-login');
    await grantDisposablePasskeyAssurance(connection, admin);
    steps.push('local-passkey-assurance-fixture');
    await page.goto(`${baseUrl}/admin/api-clients`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Agent API Credentials' }).waitFor();
    const agentName = `Browser agent ${pilotStamp()}`;
    await page.getByLabel('Agent name').fill(agentName);
    await page.getByLabel('Accountable user').selectOption({ label: accountable.username });
    await page.getByLabel('Purpose').fill('Disposable browser proof for scoped accountable agent access.');
    await page.getByRole('checkbox', { name: /Edit graph links/i }).check();
    await page.getByLabel('Requests per minute').fill('37');
    await page.getByRole('button', { name: 'Create Agent Credential' }).click();
    const tokenField = page.getByLabel('One-time agent token');
    await tokenField.waitFor();
    const originalToken = await tokenField.inputValue();
    assert.match(originalToken, /^wt_agent_[a-f\d]{24}\.[A-Za-z0-9_-]{32,}$/);
    const originalIdentity = await bearerIdentity(context, originalToken);
    assert.equal(originalIdentity.status, 200, JSON.stringify(originalIdentity.payload));
    assert.equal(originalIdentity.payload?.accountableUser?.username, accountable.username);
    assert.deepEqual(originalIdentity.payload?.client?.scopes, ['entries:read', 'entries:create', 'graph:write']);
    steps.push('credential-created-and-bearer-authenticated');
    await page.getByRole('button', { name: 'Hide token' }).click();
    await tokenField.waitFor({ state: 'detached' });

    const row = page.getByRole('row').filter({ hasText: agentName });
    await row.getByRole('button', { name: 'Usage' }).click();
    const desktopUsage = page.getByRole('heading', { name: `${agentName} usage` });
    await desktopUsage.waitFor();
    const desktopUsagePanel = page.locator('section').filter({ has: desktopUsage });
    await desktopUsagePanel.getByText('Requests', { exact: true }).waitFor();
    const desktopWidths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(desktopWidths.document <= desktopWidths.viewport, `Agent page overflowed at desktop: ${desktopWidths.document}px > ${desktopWidths.viewport}px`);
    const desktopTableWidths = await page.locator('.table-responsive').evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    assert.ok(desktopTableWidths.scroll <= desktopTableWidths.client, `Credential table overflowed at desktop: ${desktopTableWidths.scroll}px > ${desktopTableWidths.client}px`);
    await page.screenshot({ path: path.join(outDir, 'credential-usage-desktop.png'), fullPage: true });
    await desktopUsagePanel.getByRole('button', { name: 'Close usage report' }).click();
    steps.push('credential-usage-desktop');

    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Rotate' }).click();
    await page.waitForFunction((previousToken) => {
      const field = document.querySelector('[aria-label="One-time agent token"]');
      return field instanceof HTMLTextAreaElement && field.value !== previousToken;
    }, originalToken);
    const rotatedToken = await tokenField.inputValue();
    assert.notEqual(rotatedToken, originalToken);
    const invalidatedOriginalIdentity = await bearerIdentity(context, originalToken);
    assert.equal(invalidatedOriginalIdentity.status, 401, JSON.stringify(invalidatedOriginalIdentity.payload));
    const rotatedIdentity = await bearerIdentity(context, rotatedToken);
    assert.equal(rotatedIdentity.status, 200, JSON.stringify(rotatedIdentity.payload));
    steps.push('credential-rotation-invalidated-old-secret');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Agent API Credentials' }).waitFor();
    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(widths.document <= widths.viewport, `Agent page overflowed: ${widths.document}px > ${widths.viewport}px`);
    const mobileRow = page.getByRole('row').filter({ hasText: agentName });
    await mobileRow.getByRole('button', { name: 'Usage' }).click();
    const mobileUsage = page.getByRole('heading', { name: `${agentName} usage` });
    await mobileUsage.waitFor();
    await page.getByText('Governance and safety events', { exact: true }).waitFor();
    const mobileUsageWidths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(mobileUsageWidths.document <= mobileUsageWidths.viewport, `Usage panel overflowed: ${mobileUsageWidths.document}px > ${mobileUsageWidths.viewport}px`);
    const mobileTableWidths = await page.locator('.table-responsive').evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
      offenders: [element, ...Array.from(element.querySelectorAll('*'))]
        .filter((candidate) => candidate.scrollWidth > candidate.clientWidth + 1)
        .slice(0, 8)
        .map((candidate) => ({
          tag: candidate.tagName,
          className: candidate.className,
          client: candidate.clientWidth,
          scroll: candidate.scrollWidth,
          text: candidate.textContent?.trim().slice(0, 80),
        })),
    }));
    assert.ok(mobileTableWidths.scroll <= mobileTableWidths.client, `Credential table overflowed on mobile: ${JSON.stringify(mobileTableWidths)}`);
    await page.screenshot({ path: path.join(outDir, 'credential-usage-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Close usage report' }).click();
    steps.push('agent-management-and-usage-mobile-overflow');

    page.once('dialog', (dialog) => dialog.accept());
    await mobileRow.getByRole('button', { name: 'Revoke' }).click();
    await mobileRow.getByText('revoked', { exact: true }).waitFor();
    const revokedIdentity = await bearerIdentity(context, rotatedToken);
    assert.equal(revokedIdentity.status, 401, JSON.stringify(revokedIdentity.payload));
    steps.push('credential-revocation-invalidated-current-secret');
    assert.deepEqual(consoleErrors, []);
    credentialEvidence = {
      ownerUserId: String(accountable.userId),
      scopes: ['entries:read', 'entries:create', 'graph:write'],
      rateLimitPerMinute: 37,
      originalTokenInvalidAfterRotation: true,
      rotatedTokenInvalidAfterRevocation: true,
      finalStatus: 'revoked',
    };
  } catch (error) {
    runError = error;
  } finally {
    if (browser) await browser.close();
    cleanupResidue = await cleanup(connection, identities);
    await connection.close();
  }

  const manifest = {
    result: runError ? 'FAIL' : 'PASS',
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: { channel: browserChannel, version: browserVersion, headless },
    steps,
    credential: credentialEvidence,
    consoleErrors,
    environmentWarnings,
    cleanup: { mutableFixtureResidue: cleanupResidue, immutableAuditEventsRetained: true, rawTokensRetained: false },
    error: runError instanceof Error ? runError.message : runError ? String(runError) : null,
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  assert.ok(Object.values(cleanupResidue || {}).every((count) => count === 0), `Mutable fixture residue remained: ${JSON.stringify(cleanupResidue)}`);
  if (runError) throw runError;
  console.log(`Disposable agent Chrome QA passed: ${manifestPath}`);
  console.log(`Browser: ${browserChannel} ${browserVersion}`);
  console.log(`Steps: ${steps.join(', ')}`);
  console.log('Agent credentials and identities removed; immutable audit evidence retained.');
}

main().catch((error) => {
  console.error(`Disposable agent Chrome QA failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
