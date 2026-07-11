#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { cleanupParityGroupFixture, ensureParityGroupFixture } from './parity-group-fixture.mjs';

const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';
const explicitOutDir = process.argv[3] || '';
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = explicitOutDir || path.join('docs', 'qa', 'artifacts', `parity-screenshots-${runStamp}`);

const baseRoutePairs = [
  { name: 'home', modern: '/', legacy: '/legacy/' },
  { name: 'explore', modern: '/explore', legacy: '/legacy/explore' },
  { name: 'search', modern: '/search?q=gmo', legacy: '/legacy/search?q=gmo' },
  { name: 'visualize', modern: '/visualize', legacy: '/legacy/visualize' },
  { name: 'group', modern: '/groups', legacy: '/legacy/groups' },
  { name: 'profile', modern: '/members', legacy: '/legacy/members' },
  { name: 'admin', modern: '/admin', legacy: '/legacy/admin' },
];

async function capturePage(page, url, outputPath) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!response || response.status() >= 400) {
    throw new Error(`${url} returned HTTP ${response?.status() || 'no response'}`);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outputPath, fullPage: true });
  return response.status();
}

function resolveTopicCandidateFromHome(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const topics = Array.isArray(payload.topics) ? payload.topics : [];
  if (topics.length > 0) {
    return topics.find((topic) => topic && topic._id) || null;
  }

  const entrySet = Array.isArray(payload.entrySet) ? payload.entrySet : [];
  return entrySet.find((entry) => entry && entry._id && String(entry.objectName || '').toLowerCase() === 'topic') || null;
}

async function resolveTopicEntryPair(context) {
  try {
    const homeResponse = await context.request.get(`${baseUrl}/api/home`, {
      failOnStatusCode: false,
      timeout: 30000,
    });

    if (!homeResponse.ok()) {
      return null;
    }

    const homePayload = await homeResponse.json();
    const topicCandidate = resolveTopicCandidateFromHome(homePayload);
    if (!topicCandidate || !topicCandidate._id) {
      return null;
    }

    const topicId = encodeURIComponent(String(topicCandidate._id));
    const topicFriendly = encodeURIComponent(String(topicCandidate.friendlyUrl || topicCandidate.title || topicCandidate._id));

    return {
      name: 'topic-entry',
      modern: `/topics/entry/${topicFriendly}/${topicId}`,
      legacy: `/legacy/topic/${topicFriendly}/${topicId}`,
      source: 'api/home',
      topicId: String(topicCandidate._id),
      topicFriendly: String(topicCandidate.friendlyUrl || topicCandidate.title || topicCandidate._id),
    };
  } catch (_error) {
    return null;
  }
}

function isLocalFixtureTarget() {
  const hostname = new URL(baseUrl).hostname;
  return ['127.0.0.1', 'localhost', '::1'].includes(hostname)
    || ['1', 'true', 'yes'].includes(String(process.env.WT_PARITY_ALLOW_DB_FIXTURE || '').toLowerCase());
}

function buildGroupPairs(group) {
  const id = encodeURIComponent(String(group.id));
  const friendly = encodeURIComponent(String(group.friendlyUrl));
  const modernBase = `/groups/${friendly}/${id}`;
  const legacyBase = `/legacy/groups/${friendly}/${id}`;
  return [
    { name: 'group-entry', modern: modernBase, legacy: legacyBase, group },
    { name: 'group-posts', modern: `${modernBase}/posts`, legacy: `${legacyBase}/posts`, group },
    { name: 'group-members', modern: `${modernBase}/members`, legacy: `${legacyBase}/members`, group },
  ];
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  let browser;
  let fixture = null;
  try {
    if (isLocalFixtureTarget()) {
      fixture = await ensureParityGroupFixture();
      console.log(`Prepared group fixture ${fixture.id}`);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1366, height: 960 },
    });
    const page = await context.newPage();
    const resolvedTopicPair = await resolveTopicEntryPair(context);
    const routePairs = [
      ...baseRoutePairs,
      ...(resolvedTopicPair ? [resolvedTopicPair] : []),
      ...(fixture ? buildGroupPairs(fixture) : []),
    ];
    const manifest = [];

    for (const pair of routePairs) {
      const modernPath = `${pair.name}-modern.png`;
      const legacyPath = `${pair.name}-legacy.png`;
      const modernUrl = `${baseUrl}${pair.modern}`;
      const legacyUrl = `${baseUrl}${pair.legacy}`;
      const modernFile = path.join(outDir, modernPath);
      const legacyFile = path.join(outDir, legacyPath);
      const modernStatus = await capturePage(page, modernUrl, modernFile);
      const legacyStatus = await capturePage(page, legacyUrl, legacyFile);

      manifest.push({
        name: pair.name,
        modernUrl,
        legacyUrl,
        modernStatus,
        legacyStatus,
        modernFile,
        legacyFile,
        topicSource: pair.source,
        topicId: pair.topicId,
        topicFriendly: pair.topicFriendly,
        groupFixture: pair.group || null,
      });
      console.log(`Captured ${pair.name}`);
    }

    const manifestPath = path.join(outDir, 'manifest.json');
    await fs.writeFile(manifestPath, `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), pairs: manifest }, null, 2)}\n`, 'utf8');
    console.log(`Saved parity screenshots to ${outDir}`);
    console.log(`Manifest: ${manifestPath}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (fixture) {
      await cleanupParityGroupFixture();
      console.log(`Cleaned group fixture ${fixture.id}`);
    }
  }
}

main().catch((error) => {
  console.error(`Parity screenshot capture failed: ${String(error)}`);
  process.exit(1);
});
