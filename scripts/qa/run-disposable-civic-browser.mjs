#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || process.env.WT_BASE_URL || 'https://127.0.0.1:9443';
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `civic-browser-disposable-${runDate}`);
const browserChannel = process.env.WT_CIVIC_BROWSER_CHANNEL || 'chrome';
const headless = !['0', 'false', 'no'].includes(String(process.env.WT_CIVIC_BROWSER_HEADLESS || 'true').toLowerCase());

function stamp() {
  return `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

async function insertIdentity(connection, prefix, withPlatformAdmin) {
  const token = stamp();
  const username = `${prefix}_${token}`.slice(0, 32);
  const email = `${username}@example.test`;
  const password = `Wt!${crypto.randomBytes(12).toString('base64url')}9a`;
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const adminId = withPlatformAdmin ? new mongoose.Types.ObjectId() : null;
  const now = new Date();

  await connection.collection('accounts').insertOne({
    _id: accountId,
    user: { id: userId, name: username },
    isVerified: 'yes',
    name: { full: username },
    search: [username, email],
  });
  if (adminId) {
    await connection.collection('admins').insertOne({
      _id: adminId,
      user: { id: userId, name: username },
      name: { full: username },
      groups: [],
      permissions: [],
      timeCreated: now,
      search: [username],
    });
  }
  await connection.collection('users').insertOne({
    _id: userId,
    username,
    email,
    password: await bcrypt.hash(password, 10),
    isActive: 'yes',
    timeCreated: now,
    roles: {
      account: accountId,
      ...(adminId ? { admin: adminId, screener: true, reviewer: true } : {}),
    },
    onboarding: {
      contributor: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId },
      reviewer: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId, assignedDate: now },
    },
    search: [username, email],
  });
  return { username, email, password, userId, accountId, adminId };
}

async function login(page, identity) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Username or Email').fill(identity.username);
  await page.getByLabel('Password').fill(identity.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 });
}

async function waitForStatus(page, text) {
  try {
    await page.getByRole('status').filter({ hasText: text }).waitFor({ state: 'visible', timeout: 20_000 });
  } catch (error) {
    const statuses = await page.getByRole('status').allTextContents();
    throw new Error(`Expected status "${text}"; page statuses: ${JSON.stringify(statuses)}; ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function assertFormValid(page, submitButtonName) {
  const invalid = await page.getByRole('button', { name: submitButtonName }).evaluate((button) => {
    const form = button.closest('form');
    if (!form) return [{ id: '(form)', message: 'Submit button has no parent form', value: '' }];
    return [...form.elements]
      .filter((element) => typeof element.checkValidity === 'function' && !element.checkValidity())
      .map((element) => ({ id: element.id || element.name || element.tagName, message: element.validationMessage, value: element.value }));
  });
  assert.deepEqual(invalid, [], `Invalid ${submitButtonName} fields: ${JSON.stringify(invalid)}`);
}

function observeConsole(page, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
}

async function configureDisposableTenant(page, fixture) {
  await page.goto(`${baseUrl}/admin/civic-tenants`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Civic tenants' }).waitFor();
  await page.getByLabel('Tenant ID').fill(fixture.tenantId);
  await page.getByLabel('Country code').fill('XZ');
  await page.getByLabel('Public title').fill(fixture.tenantTitle);
  await page.getByLabel('Domains').fill(fixture.tenantDomain);
  await page.getByRole('button', { name: 'Create tenant' }).click();
  await waitForStatus(page, 'Civic tenant created.');

  await page.getByRole('button', { name: new RegExp(fixture.tenantTitle, 'i') }).click();
  await page.getByLabel('Navigation title').fill('FixQA');
  await page.getByLabel('Status').selectOption('inactive');
  await assertFormValid(page, 'Update tenant');
  await page.getByRole('button', { name: 'Update tenant' }).click();
  await waitForStatus(page, 'Tenant configuration updated.');
}

async function assignMembershipAndJurisdiction(page, contributor, fixture) {
  await page.goto(`${baseUrl}/admin/civic-operations`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Fix The Philippines operations/i }).waitFor();
  await page.getByLabel('Find a user').fill(contributor.username);
  await page.getByRole('button', { name: 'Search users' }).click();
  await page.getByRole('button', { name: new RegExp(contributor.username, 'i') }).click();
  await page.getByRole('checkbox', { name: 'contributor', exact: true }).check();
  await page.getByRole('checkbox', { name: 'reviewer', exact: true }).check();
  await page.getByRole('button', { name: 'Save tenant access' }).click();
  await waitForStatus(page, 'Tenant access updated');

  await page.getByLabel('Code').fill(fixture.jurisdictionCode);
  await page.getByLabel('Name').fill(fixture.jurisdictionName);
  await page.getByLabel('Level').selectOption('region');
  await page.getByRole('button', { name: 'Create jurisdiction' }).click();
  await waitForStatus(page, 'Jurisdiction created.');

  const jurisdictionCard = page.locator('.list-group-item').filter({ hasText: fixture.jurisdictionName });
  await jurisdictionCard.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Name').fill(fixture.updatedJurisdictionName);
  await page.getByRole('button', { name: 'Update jurisdiction' }).click();
  await waitForStatus(page, 'Jurisdiction updated.');
}

async function exerciseContributorWorkflow(page, fixture, artifact) {
  await page.goto(`${baseUrl}/civic/incidents`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Incidents & Observations/i }).first().waitFor();
  await page.getByLabel('Record type').selectOption('incident');
  await page.getByLabel('Title').fill(fixture.recordTitle);
  await page.getByLabel('At-a-glance summary').fill('A disposable browser QA record for the reusable civic workflow.');
  await page.getByLabel('Details and evidence context').fill('This record validates create, update, lifecycle, jurisdiction, and knowledge-link behavior in Google Chrome.');
  await page.getByLabel('Severity').selectOption('high');
  await page.getByRole('textbox', { name: 'Region', exact: true }).last().fill('QA Region');
  await page.getByLabel('City / municipality').fill('QA City');
  await page.getByLabel('Official jurisdiction').selectOption({ label: fixture.updatedJurisdictionName });
  await page.getByRole('button', { name: 'Submit civic record' }).click();
  await waitForStatus(page, 'Submitted for screening.');
  await page.getByRole('link', { name: fixture.recordTitle }).click();
  await page.waitForURL(/\/civic\/records\/[a-f0-9]{24}$/);
  fixture.recordId = page.url().split('/').pop();

  await page.getByRole('button', { name: 'Edit record' }).click();
  await page.getByLabel('Title').fill(fixture.updatedRecordTitle);
  await page.getByLabel('At-a-glance summary').fill('Updated through the tenant-scoped contributor editor.');
  await page.getByRole('button', { name: 'Save record details' }).click();
  await waitForStatus(page, 'Civic record details updated.');
  await page.getByRole('heading', { name: fixture.updatedRecordTitle }).waitFor();

  await page.getByLabel('Wikitruth entry ID').fill(String(artifact._id));
  await page.getByRole('button', { name: 'Link entry' }).click();
  await waitForStatus(page, 'Wikitruth entry linked.');
  await page.getByRole('link', { name: artifact.title }).waitFor();
  await page.getByRole('button', { name: 'Remove' }).click();
  await waitForStatus(page, 'Wikitruth entry link removed.');

  await page.getByLabel('Status').selectOption('verified');
  await page.getByLabel('Stage').selectOption('investigating');
  await page.getByLabel('Reason').fill('Disposable Chrome QA independently verified the tenant workflow and linked evidence controls.');
  await page.getByRole('button', { name: 'Record decision' }).click();
  await waitForStatus(page, 'Lifecycle decision recorded.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/civic/incidents`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Incidents & Observations/i }).first().waitFor();
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(widths.document <= widths.viewport, `Authenticated civic page overflowed: ${widths.document}px > ${widths.viewport}px`);
}

async function deactivateFixtures(page, contributor, fixture) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseUrl}/admin/civic-operations`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Fix The Philippines operations/i }).waitFor();

  const jurisdictionCard = page.locator('.list-group-item').filter({ hasText: fixture.updatedJurisdictionName });
  page.once('dialog', (dialog) => dialog.accept());
  await jurisdictionCard.getByRole('button', { name: 'Deactivate' }).click();
  await waitForStatus(page, 'was deactivated.');

  await page.getByRole('button', { name: new RegExp(contributor.username, 'i') }).click();
  await page.getByRole('checkbox', { name: 'Active membership' }).uncheck();
  await page.getByRole('button', { name: 'Save tenant access' }).click();
  await waitForStatus(page, 'Tenant access updated');
}

async function cleanup(connection, identities, fixture) {
  const userIds = identities.map((identity) => identity.userId);
  const accountIds = identities.map((identity) => identity.accountId);
  const adminIds = identities.map((identity) => identity.adminId).filter(Boolean);
  const sessionPattern = userIds.length ? userIds.map(String).join('|') : null;
  const records = await connection.collection('civicrecords').find({ createUserId: { $in: userIds } }, { projection: { _id: 1 } }).toArray();
  const recordIds = records.map((record) => record._id);

  const cleanupTasks = [
    connection.collection('civicentrylinks').deleteMany({ civicRecordId: { $in: recordIds } }),
    connection.collection('entryrevisions').deleteMany({ objectId: { $in: recordIds } }),
    connection.collection('notifications').deleteMany({ userId: { $in: userIds } }),
    connection.collection('tenantmemberships').deleteMany({ userId: { $in: userIds } }),
    connection.collection('jurisdictions').deleteMany({ code: fixture.jurisdictionCode }),
    connection.collection('civicrecords').deleteMany({ _id: { $in: recordIds } }),
    connection.collection('civictenants').deleteMany({ tenantId: fixture.tenantId }),
    connection.collection('reputationsnapshots').deleteMany({ userId: { $in: userIds } }),
    connection.collection('users').deleteMany({ _id: { $in: userIds } }),
    connection.collection('accounts').deleteMany({ _id: { $in: accountIds } }),
    connection.collection('admins').deleteMany({ _id: { $in: adminIds } }),
  ];
  if (sessionPattern) {
    cleanupTasks.push(connection.collection('sessions').deleteMany({ session: { $regex: sessionPattern } }));
  }
  await Promise.all(cleanupTasks);

  return {
    users: await connection.collection('users').countDocuments({ _id: { $in: userIds } }),
    accounts: await connection.collection('accounts').countDocuments({ _id: { $in: accountIds } }),
    administrators: await connection.collection('admins').countDocuments({ _id: { $in: adminIds } }),
    sessions: sessionPattern ? await connection.collection('sessions').countDocuments({ session: { $regex: sessionPattern } }) : 0,
    memberships: await connection.collection('tenantmemberships').countDocuments({ userId: { $in: userIds } }),
    jurisdictions: await connection.collection('jurisdictions').countDocuments({ code: fixture.jurisdictionCode }),
    records: await connection.collection('civicrecords').countDocuments({ _id: { $in: recordIds } }),
    entryLinks: await connection.collection('civicentrylinks').countDocuments({ civicRecordId: { $in: recordIds } }),
    revisions: await connection.collection('entryrevisions').countDocuments({ objectId: { $in: recordIds } }),
    notifications: await connection.collection('notifications').countDocuments({ userId: { $in: userIds } }),
    reputationSnapshots: await connection.collection('reputationsnapshots').countDocuments({ userId: { $in: userIds } }),
    tenant: await connection.collection('civictenants').countDocuments({ tenantId: fixture.tenantId }),
  };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  const token = stamp();
  const fixture = {
    tenantId: `fix-qa-${token}`.slice(0, 40),
    tenantTitle: `Fix QA ${token}`,
    tenantDomain: `${token}.example.test`,
    jurisdictionCode: `QA-${token}`.slice(0, 60),
    jurisdictionName: `QA Region ${token}`,
    updatedJurisdictionName: `QA Region ${token} Updated`,
    recordTitle: `QA civic incident ${token}`,
    updatedRecordTitle: `QA civic incident ${token} updated`,
    recordId: '',
  };
  const identities = [];
  const consoleErrors = [];
  const steps = [];
  let browser = null;
  let runError = null;
  let cleanupResidue = null;
  let browserVersion = '';

  try {
    const admin = await insertIdentity(connection, 'qa_civic_admin', true);
    identities.push(admin);
    const contributor = await insertIdentity(connection, 'qa_civic_member', false);
    identities.push(contributor);
    const artifact = await connection.collection('artifacts').findOne({ private: { $ne: true } }, { projection: { _id: 1, title: 1 } });
    assert.ok(artifact?._id && artifact?.title, 'A public artifact is required for the knowledge-link browser flow');

    browser = await chromium.launch({ channel: browserChannel, headless });
    browserVersion = browser.version();
    const adminContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
    const contributorContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
    const adminPage = await adminContext.newPage();
    const contributorPage = await contributorContext.newPage();
    observeConsole(adminPage, consoleErrors);
    observeConsole(contributorPage, consoleErrors);

    await login(adminPage, admin);
    steps.push('platform-admin-login');
    await configureDisposableTenant(adminPage, fixture);
    steps.push('tenant-create-update-inactivate');
    await assignMembershipAndJurisdiction(adminPage, contributor, fixture);
    steps.push('membership-assign');
    steps.push('jurisdiction-create-update');

    await login(contributorPage, contributor);
    steps.push('tenant-member-login');
    await exerciseContributorWorkflow(contributorPage, fixture, artifact);
    steps.push('record-create-update');
    steps.push('knowledge-link-add-remove');
    steps.push('lifecycle-transition');
    steps.push('authenticated-mobile-overflow');

    await deactivateFixtures(adminPage, contributor, fixture);
    steps.push('jurisdiction-deactivate');
    steps.push('membership-deactivate');
    assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    runError = error;
  } finally {
    if (browser) await browser.close();
    cleanupResidue = await cleanup(connection, identities, fixture);
    await connection.close();
  }

  const manifest = {
    result: runError ? 'FAIL' : 'PASS',
    runDate,
    baseUrl,
    browser: { channel: browserChannel, version: browserVersion, headless },
    tenant: 'fixtheph',
    steps,
    consoleErrors,
    cleanup: {
      mutableFixtureResidue: cleanupResidue,
      immutableAuditEventsRetained: true,
      credentialsRetained: false,
    },
    error: runError instanceof Error ? runError.message : runError ? String(runError) : null,
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (runError) throw runError;
  assert.ok(Object.values(cleanupResidue || {}).every((count) => count === 0), `Mutable fixture residue remained: ${JSON.stringify(cleanupResidue)}`);
  console.log(`Disposable civic Chrome QA passed: ${manifestPath}`);
  console.log(`Browser: ${browserChannel} ${browserVersion}`);
  console.log(`Steps: ${steps.join(', ')}`);
  console.log('Mutable fixture cleanup verified; immutable audit evidence retained by design.');
}

main().catch((error) => {
  console.error(`Disposable civic Chrome QA failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
