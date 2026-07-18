#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { assertLocalPilotTargets } from './epistemic-pilot-support.mjs';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || process.env.WT_PUBLIC_BROWSER_BASE_URL || 'https://127.0.0.1:9443';
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `public-modern-browser-${runDate}`);
const browserChannel = process.env.WT_PUBLIC_BROWSER_CHANNEL || 'chrome';
const headless = !['0', 'false', 'no'].includes(String(process.env.WT_PUBLIC_BROWSER_HEADLESS || 'true').toLowerCase());
const viewports = [
  { name: 'desktop', width: 1366, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function topicRoute(context) {
  const response = await context.request.get(`${baseUrl}/api/v1/home`, { failOnStatusCode: false, timeout: 30_000 });
  if (!response.ok()) return null;
  const payload = await response.json();
  const entries = [...(payload.topics || []), ...(payload.entrySet || [])];
  const topic = entries.find((entry) => entry?._id && (!entry.objectName || entry.objectName === 'topic'));
  if (!topic) return null;
  return `/topics/entry/${encodeURIComponent(topic.friendlyUrl || topic.title || topic._id)}/${topic._id}`;
}

function observe(page, errors, warnings) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const detail = { message: message.text(), url: message.location().url || '' };
    if (['An SSL certificate error occurred when fetching the script.', 'An unknown error occurred when fetching the script.'].includes(detail.message)) warnings.push(detail);
    else errors.push(detail);
  });
  page.on('pageerror', (error) => errors.push({ message: error.message, url: page.url() }));
}

async function visibleFocus(page) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const style = window.getComputedStyle(element);
      return {
        tag: element.tagName,
        label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 80) || '',
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      };
    });
    if (!focus) continue;
    const outlined = focus.outlineStyle !== 'none' && focus.outlineWidth !== '0px';
    const shadowed = focus.boxShadow !== 'none';
    if (outlined || shadowed) return focus;
  }
  throw new Error('No visibly focused keyboard target was found');
}

async function inspectRoute(context, route, viewport) {
  const page = await context.newPage();
  const consoleErrors = [];
  const environmentWarnings = [];
  observe(page, consoleErrors, environmentWarnings);
  try {
    await page.setViewportSize(viewport);
    const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    assert.ok(response && response.status() < 400, `${route.path} returned ${response?.status()}`);
    await page.locator('body').waitFor({ state: 'visible' });
    await page.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await page.evaluate(() => ({
      title: document.title,
      heading: document.querySelector('h1, h2')?.textContent?.trim() || '',
      body: document.body.innerText,
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(state.title.trim(), `${route.path} has no document title`);
    assert.ok(state.heading, `${route.path} has no primary heading`);
    assert.ok(!state.body.includes('Something went wrong'), `${route.path} rendered the error boundary`);
    assert.ok(!state.body.includes('a[e] is not a function'), `${route.path} rendered a runtime error`);
    assert.ok(state.document <= state.viewport, `${route.path} overflowed ${state.document}px > ${state.viewport}px`);
    const focus = await visibleFocus(page);
    assert.deepEqual(consoleErrors, [], `${route.path} console errors: ${JSON.stringify(consoleErrors)}`);
    return {
      name: route.name,
      path: route.path,
      viewport: viewport.name,
      status: response.status(),
      title: state.title,
      heading: state.heading,
      horizontalOverflow: false,
      keyboardFocus: focus,
      consoleErrors,
      environmentWarnings,
    };
  } finally {
    await page.close();
  }
}

async function main() {
  assertLocalPilotTargets(baseUrl, config.mongodb.uri);
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: browserChannel, headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  let runError = null;
  const results = [];
  try {
    const resolvedTopic = await topicRoute(context);
    const routes = [
      { name: 'home', path: '/' },
      { name: 'explore', path: '/explore' },
      { name: 'topics', path: '/topics' },
      { name: 'artifacts', path: '/artifacts' },
      { name: 'policies', path: '/policies' },
      { name: 'civic', path: '/civic' },
      ...(resolvedTopic ? [{ name: 'topic-entry', path: resolvedTopic }] : []),
    ];
    for (const viewport of viewports) {
      for (const route of routes) results.push(await inspectRoute(context, route, viewport));
    }
  } catch (error) {
    runError = error;
  } finally {
    await context.close();
    await browser.close();
  }
  const manifest = {
    result: runError ? 'FAIL' : 'PASS',
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: { channel: browserChannel, headless },
    results,
    error: runError instanceof Error ? runError.message : runError ? String(runError) : null,
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (runError) throw runError;
  console.log(`Public modern Chrome QA passed: ${manifestPath}`);
  console.log(`Routes/viewports checked: ${results.length}`);
  console.log('All pages had headings, visible focus, no horizontal overflow, and no application console errors.');
}

main().catch((error) => {
  console.error(`Public modern Chrome QA failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
