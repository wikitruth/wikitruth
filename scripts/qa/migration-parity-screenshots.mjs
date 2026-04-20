#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';
const explicitOutDir = process.argv[3] || '';
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = explicitOutDir || path.join('docs', 'qa', 'artifacts', `parity-screenshots-${runStamp}`);

const routePairs = [
  { name: 'home', modern: '/', legacy: '/legacy/' },
  { name: 'explore', modern: '/explore', legacy: '/legacy/explore' },
  { name: 'search', modern: '/search?q=gmo', legacy: '/legacy/search?q=gmo' },
  { name: 'topic-entry', modern: '/topics/entry/Genetically%20modified%20organism%20%28GMO%29/585f106f9f8f8b346449f980', legacy: '/legacy/topic/Genetically%20modified%20organism%20%28GMO%29/585f106f9f8f8b346449f980' },
  { name: 'visualize', modern: '/visualize', legacy: '/legacy/visualize' },
  { name: 'group', modern: '/groups', legacy: '/legacy/groups' },
  { name: 'profile', modern: '/members', legacy: '/legacy/members' },
  { name: 'admin', modern: '/admin', legacy: '/legacy/admin' },
];

async function capturePage(page, url, outputPath) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outputPath, fullPage: true });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 960 },
  });
  const page = await context.newPage();

  const manifest = [];

  for (const pair of routePairs) {
    const modernPath = `${pair.name}-modern.png`;
    const legacyPath = `${pair.name}-legacy.png`;
    const modernUrl = `${baseUrl}${pair.modern}`;
    const legacyUrl = `${baseUrl}${pair.legacy}`;
    const modernFile = path.join(outDir, modernPath);
    const legacyFile = path.join(outDir, legacyPath);

    await capturePage(page, modernUrl, modernFile);
    await capturePage(page, legacyUrl, legacyFile);

    manifest.push({
      name: pair.name,
      modernUrl,
      legacyUrl,
      modernFile,
      legacyFile,
    });
    console.log(`Captured ${pair.name}`);
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), pairs: manifest }, null, 2)}\n`, 'utf8');
  await browser.close();

  console.log(`Saved parity screenshots to ${outDir}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(`Parity screenshot capture failed: ${String(error)}`);
  process.exit(1);
});
