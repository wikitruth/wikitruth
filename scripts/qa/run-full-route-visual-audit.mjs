#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { chromium } from 'playwright';
import { assertLocalPilotTargets } from './epistemic-pilot-support.mjs';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || process.env.WT_FULL_ROUTE_BASE_URL || 'https://127.0.0.1:9443';
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `full-route-visual-${runDate}`);
const browserChannel = process.env.WT_FULL_ROUTE_BROWSER_CHANNEL || 'chrome';
const headless = !['0', 'false', 'no'].includes(String(process.env.WT_FULL_ROUTE_HEADLESS || 'true').toLowerCase());
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];
const publicPatterns = new Set([
  '/login', '/signup', '/forgot-password', '/reset-password', '/logout', '/auth/continue', '/auth/handoff',
]);

function stamp() {
  return `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

function slug(value) {
  return String(value || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';
}

function readRoutePatterns(source) {
  return [...source.matchAll(/\{ path: '([^']+)'/g)].map((match) => match[1]);
}

async function sample(collection, query = {}) {
  const value = await collection.findOne(query, {
    projection: { _id: 1, title: 1, friendlyUrl: 1, username: 1, roles: 1, sections: 1 },
  });
  assert.ok(value, `Missing local fixture in ${collection.collectionName}`);
  return value;
}

async function createFixtures(connection) {
  const token = stamp();
  const username = `qa_routes_${token}`.slice(0, 32);
  const email = `${username}@example.test`;
  const password = `Wt!${crypto.randomBytes(12).toString('base64url')}9a`;
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const groupId = new mongoose.Types.ObjectId();
  const pageId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const statusId = `qa-route-status-${token}`;
  const membershipId = new mongoose.Types.ObjectId();
  const now = new Date();

  await connection.collection('accounts').insertOne({
    _id: accountId,
    user: { id: userId, name: username },
    isVerified: 'yes',
    name: { full: username },
    search: [username, email],
  });
  await connection.collection('admins').insertOne({
    _id: adminId,
    user: { id: userId, name: username },
    name: { full: username },
    groups: [],
    permissions: [],
    timeCreated: now,
    search: [username],
  });
  await connection.collection('users').insertOne({
    _id: userId,
    username,
    email,
    password: await bcrypt.hash(password, 10),
    isActive: 'yes',
    timeCreated: now,
    roles: { account: accountId, admin: adminId, screener: true, reviewer: true },
    onboarding: {
      contributor: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId },
      reviewer: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId, assignedDate: now },
    },
    search: [username, email],
  });
  await connection.collection('groups').insertOne({
    _id: groupId,
    title: `QA Route Group ${token}`,
    description: 'Disposable group used for complete route rendering and visual inspection.',
    friendlyUrl: `qa-route-group-${token}`,
    createDate: now,
    editDate: now,
    createUserId: userId,
    editUserId: userId,
    privacyType: 10,
    members: [{ userId, roleType: 20 }],
  });
  await connection.collection('pages').insertOne({
    _id: pageId,
    id: `qa-route-page-${token}`,
    title: 'QA Route Profile Page',
    content: '<p>Disposable profile page used for route and responsive visual verification.</p>',
    friendlyUrl: `qa-route-page-${token}`,
    createDate: now,
    editDate: now,
    createUserId: userId,
    editUserId: userId,
  });
  await connection.collection('categories').insertOne({
    _id: categoryId,
    id: `qa-route-category-${token}`,
    title: 'QA Route Category',
    parentId: null,
    createDate: now,
    editDate: now,
    createUserId: userId,
    editUserId: userId,
  });
  await connection.collection('status').insertOne({
    _id: statusId,
    pivot: `qa-route-${token}`,
    name: 'QA Route Status',
  });
  await connection.collection('tenantmemberships').insertOne({
    _id: membershipId,
    tenantId: 'fixtheph',
    userId,
    roles: ['reader', 'contributor', 'screener', 'reviewer', 'admin'],
    active: true,
    createUserId: userId,
    editUserId: userId,
    createDate: now,
    editDate: now,
  });

  const fixture = {
    username, email, password, userId, accountId, adminId, groupId, pageId, categoryId, statusId,
    membershipId,
    group: { _id: groupId, title: `QA Route Group ${token}`, friendlyUrl: `qa-route-group-${token}` },
    topic: await sample(connection.collection('topics'), { private: { $ne: true } }),
    argument: await sample(connection.collection('arguments'), { private: { $ne: true } }),
    question: await sample(connection.collection('questions'), { private: { $ne: true } }),
    answer: await sample(connection.collection('answers'), { private: { $ne: true } }),
    issue: await sample(connection.collection('issues'), { private: { $ne: true } }),
    opinion: await sample(connection.collection('opinions'), { private: { $ne: true } }),
    artifact: await sample(connection.collection('artifacts'), { private: { $ne: true } }),
    civicRecord: await sample(connection.collection('civicrecords'), { tenantId: 'fixtheph' }),
    aboutPage: await sample(connection.collection('pages'), { title: 'About' }),
    adminGroup: await sample(connection.collection('admingroups')),
    tenant: await sample(connection.collection('civictenants'), { tenantId: 'fixtheph' }),
  };
  return fixture;
}

async function cleanupFixtures(connection, fixture) {
  if (!fixture) return {};
  const sessionPattern = String(fixture.userId);
  const queries = {
    sessions: { session: { $regex: sessionPattern } },
    tenantmemberships: { _id: fixture.membershipId },
    groups: { _id: fixture.groupId },
    pages: { _id: fixture.pageId },
    categories: { _id: fixture.categoryId },
    status: { _id: fixture.statusId },
    reputationsnapshots: { userId: fixture.userId },
    notifications: { userId: fixture.userId },
    users: { _id: fixture.userId },
    accounts: { _id: fixture.accountId },
    admins: { _id: fixture.adminId },
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

function entityFor(pattern, fixture) {
  if (pattern.startsWith('/topics')) return fixture.topic;
  if (pattern.startsWith('/arguments')) return fixture.argument;
  if (pattern.startsWith('/questions')) return fixture.question;
  if (pattern.startsWith('/answers')) return fixture.answer;
  if (pattern.startsWith('/issues')) return fixture.issue;
  if (pattern.startsWith('/opinions') || pattern.startsWith('/comments') || pattern.startsWith('/comment/')) return fixture.opinion;
  if (pattern.startsWith('/artifacts')) return fixture.artifact;
  if (pattern.startsWith('/groups')) return fixture.group;
  if (pattern.startsWith('/visualize/topic')) return fixture.topic;
  return null;
}

function resolvePattern(pattern, fixture) {
  if (pattern === '*') return `/qa-not-found-${stamp()}`;
  let route = pattern;
  if (route === '/admin/verdicts/:id') return `/admin/verdicts/${fixture.argument._id}?type=argument`;
  if (route.startsWith('/admin/users/')) return route.replace(':id', String(fixture.userId));
  if (route.startsWith('/admin/accounts/')) return route.replace(':id', String(fixture.accountId));
  if (route.startsWith('/admin/administrators/')) return route.replace(':id', String(fixture.adminId));
  if (route.startsWith('/admin/groups/')) return route.replace(':id', String(fixture.adminGroup._id));
  if (route.startsWith('/admin/categories/')) return route.replace(':id', String(fixture.categoryId));
  if (route.startsWith('/admin/statuses/')) return route.replace(':id', String(fixture.statusId));
  if (route.startsWith('/civic/records/')) return route.replace(':id', String(fixture.civicRecord._id));
  if (route === '/about/:id') return `/about/${fixture.aboutPage._id}`;
  if (route.includes('/members/:username/pages/:id')) {
    return route.replace(':username', fixture.username).replace(':id', String(fixture.pageId));
  }
  if (route.includes('/members/profile/pages/:id')) return route.replace(':id', String(fixture.pageId));
  if (route.includes('/members/:username')) route = route.replace(':username', fixture.username);
  const entity = entityFor(route, fixture);
  if (entity) {
    route = route.replace(':friendlyUrl', entity.friendlyUrl || slug(entity.title));
    route = route.replace(':id', String(entity._id));
  }
  assert.ok(!route.includes(':'), `No fixture resolver for ${pattern}`);
  return route;
}

function expandedRoutes(patterns, fixture) {
  const routes = [];
  for (const pattern of patterns) {
    if (pattern === '/civic/:section') {
      const sections = (fixture.tenant.sections || []).filter((section) => section.enabled !== false);
      for (const section of sections) routes.push({ pattern, variant: section.slug, route: `/civic/${section.slug}` });
      continue;
    }
    routes.push({ pattern, variant: null, route: resolvePattern(pattern, fixture) });
  }
  return routes;
}

async function login(browser, fixture, viewport) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Username or Email').fill(fixture.username);
  await page.getByLabel('Password').fill(fixture.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 });
  await page.close();
  return context;
}

function safeFileName(index, item, viewport) {
  const route = `${item.pattern}${item.variant ? `-${item.variant}` : ''}`
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 100) || 'home';
  return `${String(index + 1).padStart(3, '0')}-${route}-${viewport}.jpg`;
}

async function inspectRoute(page, item, viewport, index, authenticated) {
  const consoleErrors = [];
  const environmentWarnings = [];
  const pageErrors = [];
  const requestFailures = [];
  const httpErrors = [];
  const onConsole = (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (
      value === 'An SSL certificate error occurred when fetching the script.'
      || value === 'An unknown error occurred when fetching the script.'
      || /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test(value)
    ) environmentWarnings.push(value);
    else consoleErrors.push(value);
  };
  const onPageError = (error) => pageErrors.push(error.message);
  const onRequestFailed = (request) => {
    const url = request.url();
    const errorText = request.failure()?.errorText || 'failed';
    if (url.startsWith(baseUrl) && url.includes('/api/realtime/events') && errorText === 'net::ERR_ABORTED') {
      environmentWarnings.push(`Expected realtime navigation cleanup: ${request.method()} ${url}`);
      return;
    }
    if (url.startsWith(baseUrl) && url.includes('/img/favicons/') && errorText === 'net::ERR_ABORTED') {
      environmentWarnings.push(`Expected favicon navigation cleanup: ${request.method()} ${url}`);
      return;
    }
    if (url.startsWith(baseUrl)) requestFailures.push(`${request.method()} ${url}: ${errorText}`);
  };
  const onResponse = (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  let navigationStatus = null;
  let navigationError = null;
  try {
    const response = await page.goto(`${baseUrl}${item.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    navigationStatus = response?.status() || null;
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const screenshot = path.join(outDir, safeFileName(index, item, viewport));
  await page.screenshot({ path: screenshot, fullPage: true, type: 'jpeg', quality: 55 });
  const observation = await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('h1, h2, [role="heading"]'))
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() || '')
      .find(Boolean) || '';
    const bodyText = document.body?.innerText || '';
    return {
      title: document.title,
      heading,
      bodyLength: bodyText.trim().length,
      overflow: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - window.innerWidth,
      errorBoundary: /Something went wrong|a\[e\] is not a function/i.test(bodyText),
      application: document.body?.dataset.application || '',
      errorAlerts: Array.from(document.querySelectorAll('.alert-danger'))
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() || '')
        .filter(Boolean),
    };
  });
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);
  const expectedRejectedLink = ['/auth/continue', '/auth/handoff'].includes(item.pattern);
  const expectedErrorPage = ['/500', '/503'].includes(item.pattern) || item.pattern === '*';
  const expectedErrorAlert = ['/auth/handoff', '/screening', '/convert', '/timeline'].includes(item.pattern)
    || expectedErrorPage;
  const issues = [];
  if (navigationError) issues.push(`navigation: ${navigationError}`);
  if (!observation.heading && !expectedRejectedLink) issues.push('missing heading');
  if (observation.bodyLength < 20) issues.push(`sparse body (${observation.bodyLength} chars)`);
  if (observation.overflow > 1) issues.push(`horizontal overflow ${observation.overflow}px`);
  if (observation.errorBoundary && !expectedErrorPage) issues.push('unexpected error boundary');
  if (observation.errorAlerts.length && !expectedErrorAlert) issues.push(`danger alerts: ${observation.errorAlerts.join(' | ')}`);
  if (pageErrors.length && !expectedErrorPage) issues.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length && !expectedErrorPage) issues.push(`console errors: ${consoleErrors.join(' | ')}`);
  if (requestFailures.length && !expectedErrorPage) issues.push(`request failures: ${requestFailures.join(' | ')}`);

  return {
    ...item,
    viewport,
    authenticated,
    finalUrl: page.url(),
    navigationStatus,
    screenshot: path.basename(screenshot),
    ...observation,
    consoleErrors,
    environmentWarnings,
    pageErrors,
    requestFailures,
    httpErrors,
    issues,
  };
}

async function inspectTenantShell(browser) {
  const tenantBaseUrl = 'https://fixthephilippines.org:9443';
  const results = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
    const page = await context.newPage();
    const item = { pattern: '[tenant-shell]', variant: 'fixtheph', route: '/civic' };
    const response = await page.goto(`${tenantBaseUrl}/civic`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    const body = await page.evaluate(() => ({
      application: document.body.dataset.application || '',
      title: document.title,
      heading: document.querySelector('h1, h2')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      logo: document.querySelector('img[alt*="Fix" i]')?.getAttribute('src') || '',
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    }));
    const screenshot = path.join(outDir, `tenant-fixtheph-${viewport.name}.jpg`);
    await page.screenshot({ path: screenshot, fullPage: true, type: 'jpeg', quality: 55 });
    const issues = [];
    if (body.application !== 'fixtheph') issues.push(`tenant application was ${body.application || 'unset'}`);
    if (!/Fix The Philippines|FixPH/i.test(`${body.title} ${body.heading}`)) issues.push('FixPH page identity missing');
    if (body.overflow > 1) issues.push(`horizontal overflow ${body.overflow}px`);
    results.push({ ...item, viewport: viewport.name, navigationStatus: response?.status() || null, screenshot: path.basename(screenshot), ...body, issues });
    await context.close();
  }
  return results;
}

async function main() {
  assertLocalPilotTargets(baseUrl, config.mongodb.uri);
  await fs.mkdir(outDir, { recursive: true });
  const source = await fs.readFile('client/src/routes/routeConfig.tsx', 'utf8');
  const patterns = readRoutePatterns(source);
  assert.equal(patterns.length, 140, 'Route count changed; update and review the full-route acceptance audit');
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  let fixture = null;
  let browser = null;
  let runError = null;
  let cleanupResidue = null;
  const results = [];

  try {
    fixture = await createFixtures(connection);
    const routes = expandedRoutes(patterns, fixture);
    browser = await chromium.launch({
      channel: browserChannel,
      headless,
      args: ['--host-resolver-rules=MAP fixthephilippines.org 127.0.0.1'],
    });
    for (const viewport of viewports) {
      const authContext = await login(browser, fixture, viewport);
      const publicContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport });
      const authPage = await authContext.newPage();
      const publicPage = await publicContext.newPage();
      for (let index = 0; index < routes.length; index += 1) {
        const item = routes[index];
        const authenticated = !publicPatterns.has(item.pattern);
        results.push(await inspectRoute(authenticated ? authPage : publicPage, item, viewport.name, index, authenticated));
      }
      await authContext.close();
      await publicContext.close();
    }
    results.push(...await inspectTenantShell(browser));
  } catch (error) {
    runError = error;
  } finally {
    if (browser) await browser.close();
    cleanupResidue = await cleanupFixtures(connection, fixture);
    await connection.close();
  }

  const coveredPatterns = new Set(results.filter((result) => result.pattern === '*' || result.pattern.startsWith('/'))
    .map((result) => result.pattern));
  const issueResults = results.filter((result) => result.issues.length > 0);
  const manifest = {
    result: runError || issueResults.length ? 'FAIL' : 'PASS',
    runDate,
    baseUrl,
    browser: { channel: browserChannel, headless },
    routePatterns: patterns.length,
    coveredPatterns: coveredPatterns.size,
    renders: results.length,
    tenantHostResolution: { hostname: 'fixthephilippines.org', forcedAddress: '127.0.0.1', productionContacted: false },
    issueCount: issueResults.length,
    issues: issueResults.map((result) => ({ pattern: result.pattern, variant: result.variant, viewport: result.viewport, issues: result.issues })),
    cleanup: { mutableFixtureResidue: cleanupResidue, immutableAuditEventsRetained: true, credentialsRetained: false },
    error: runError instanceof Error ? runError.message : runError ? String(runError) : null,
    results,
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (runError) throw runError;
  assert.equal(coveredPatterns.size, patterns.length, 'Not every route pattern was rendered');
  assert.ok(Object.values(cleanupResidue || {}).every((count) => count === 0), `Route fixture residue remained: ${JSON.stringify(cleanupResidue)}`);
  if (issueResults.length) throw new Error(`${issueResults.length} route render(s) need review; see ${manifestPath}`);
  console.log(`Full route visual audit passed: ${manifestPath}`);
  console.log(`${coveredPatterns.size} route patterns, ${results.length} desktop/mobile and tenant renders, no detected issues.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
