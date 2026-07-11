#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';
const explicitOutDir = process.argv[3] || '';
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = explicitOutDir || path.join('docs', 'qa', 'artifacts', `parity-semantic-${runStamp}`);

const FAMILY_CONFIG = {
  topic: { bucket: 'topics', modern: '/topics/entry', legacy: '/legacy/topic' },
  argument: { bucket: 'arguments', modern: '/arguments/entry', legacy: '/legacy/argument' },
  question: { bucket: 'questions', modern: '/questions/entry', legacy: '/legacy/question' },
  answer: { bucket: 'answers', modern: '/answers/entry', legacy: '/legacy/answer', modernIdOnly: true },
  issue: { bucket: 'issues', modern: '/issues/entry', legacy: '/legacy/issue' },
  opinion: { bucket: 'opinions', modern: '/opinions/entry', legacy: '/legacy/opinion' },
  artifact: { bucket: 'artifacts', modern: '/artifacts/entry', legacy: '/legacy/artifact' },
};

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildPair(family, entry) {
  const config = FAMILY_CONFIG[family];
  const id = encodeURIComponent(String(entry._id));
  const friendly = encodeURIComponent(String(entry.friendlyUrl || entry.title || entry._id));
  return {
    family,
    id: String(entry._id),
    expectedTitle: normalize(entry.title),
    modern: config.modernIdOnly ? `${config.modern}/${id}` : `${config.modern}/${friendly}/${id}`,
    legacy: `${config.legacy}/${friendly}/${id}`,
  };
}

async function inspectEntry(page, absoluteUrl, expectedTitle) {
  const response = await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const status = response?.status() || 0;
  await page.waitForFunction(
    (title) => String(document.body?.innerText || '').replace(/\s+/g, ' ').includes(String(title)),
    expectedTitle,
    { timeout: 15_000 },
  ).catch(() => {});
  await page.waitForTimeout(350);

  return page.evaluate(({ title, responseStatus }) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const bodyText = clean(document.body?.innerText);
    const heading = clean(document.querySelector('h1')?.textContent);
    const breadcrumb = clean(
      document.querySelector('nav[aria-label="breadcrumb"], .wt-breadcrumb, .breadcrumb')?.textContent,
    );
    const tabs = Array.from(document.querySelectorAll('.nav-tabs li, [role="tab"]'))
      .map((node) => clean(node.textContent))
      .filter(Boolean);
    const actionText = Array.from(document.querySelectorAll('.entry-options, .wt-entry-options-container, .wt-entry-actions'))
      .map((node) => clean(node.textContent))
      .join(' ');
    const errorMarkers = ['Something went wrong', 'Page not found', 'Entry not found']
      .filter((marker) => bodyText.includes(marker));

    return {
      status: responseStatus,
      documentTitle: document.title,
      heading,
      breadcrumb,
      tabs,
      actionText,
      bodyHasExpectedTitle: bodyText.includes(title),
      hasDetails: /\bDetails\b/i.test(bodyText),
      actions: {
        reply: /\bReply\b/i.test(bodyText),
        expose: /\bExpose\b/i.test(bodyText),
        bury: /\bBury\b/i.test(bodyText),
        more: /\bmore\b/i.test(bodyText),
      },
      errorMarkers,
    };
  }, { title: expectedTitle, responseStatus: status });
}

function validateEntry(pair, side, inventory) {
  const failures = [];
  if (inventory.status >= 400 || inventory.status === 0) failures.push(`${side} HTTP ${inventory.status}`);
  if (!inventory.bodyHasExpectedTitle) failures.push(`${side} missing expected title`);
  if (!inventory.breadcrumb) failures.push(`${side} missing breadcrumb`);
  if (!inventory.hasDetails) failures.push(`${side} missing Details section`);
  for (const [action, present] of Object.entries(inventory.actions)) {
    if (!present) failures.push(`${side} missing ${action} action`);
  }
  if (inventory.errorMarkers.length > 0) failures.push(`${side} rendered ${inventory.errorMarkers.join(', ')}`);
  return failures.map((message) => `${pair.family}: ${message}`);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 960 } });
  const page = await context.newPage();
  const failures = [];

  try {
    const homeResponse = await context.request.get(`${baseUrl}/api/home`, { failOnStatusCode: false });
    if (!homeResponse.ok()) throw new Error(`/api/home returned ${homeResponse.status()}`);
    const home = await homeResponse.json();
    const pairs = [];
    for (const [family, config] of Object.entries(FAMILY_CONFIG)) {
      const entry = Array.isArray(home[config.bucket]) ? home[config.bucket].find((item) => item?._id) : null;
      if (!entry) {
        failures.push(`${family}: no representative entry returned by /api/home`);
        continue;
      }
      pairs.push(buildPair(family, entry));
    }

    const entries = [];
    for (const pair of pairs) {
      const modern = await inspectEntry(page, `${baseUrl}${pair.modern}`, pair.expectedTitle);
      const legacy = await inspectEntry(page, `${baseUrl}${pair.legacy}`, pair.expectedTitle);
      failures.push(...validateEntry(pair, 'modern', modern), ...validateEntry(pair, 'legacy', legacy));

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseUrl}${pair.modern}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(500);
      const mobile = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      if (mobile.documentWidth > mobile.viewportWidth) {
        failures.push(`${pair.family}: modern mobile overflow ${mobile.documentWidth}/${mobile.viewportWidth}`);
      }
      await page.setViewportSize({ width: 1366, height: 960 });

      entries.push({ ...pair, modern, legacy, mobile });
      console.log(`Checked ${pair.family}: modern=${modern.status} legacy=${legacy.status} mobile=${mobile.documentWidth}/${mobile.viewportWidth}`);
    }

    const manifest = {
      baseUrl,
      generatedAt: new Date().toISOString(),
      entries,
      failures,
      passed: failures.length === 0 && entries.length === Object.keys(FAMILY_CONFIG).length,
    };
    const manifestPath = path.join(outDir, 'manifest.json');
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Manifest: ${manifestPath}`);

    if (!manifest.passed) {
      throw new Error(`Semantic parity failed:\n- ${failures.join('\n- ')}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
