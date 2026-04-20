#!/usr/bin/env node
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';

const pageChecks = [
  { label: 'modern-home', path: '/', pattern: /Latest Posts|Explore/i },
  { label: 'legacy-home', path: '/legacy/', pattern: /Latest Posts|Explore/i },
  { label: 'modern-explore', path: '/explore', pattern: /Explore|Topics|Facts/i },
  { label: 'legacy-explore', path: '/legacy/explore', pattern: /Explore|Topics|Facts/i },
  { label: 'modern-auth-page', path: '/login', pattern: /Sign In|Login/i },
  { label: 'legacy-auth-page', path: '/legacy/login/', pattern: /Sign In|Login/i },
  { label: 'modern-admin-route', path: '/admin', pattern: /Sign In|Admin/i },
  { label: 'modern-moderation-route', path: '/admin/verdicts', pattern: /Sign In|Verdict|Moderation/i },
  { label: 'modern-app-alias', path: '/app/explore', pattern: /Explore|Topics|Facts/i },
];

async function run() {
  console.log(`Running migration parity walkthrough against ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  let failed = false;

  for (const check of pageChecks) {
    try {
      await page.goto(`${baseUrl}${check.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1000);
      const bodyText = await page.textContent('body');
      const matched = check.pattern.test(String(bodyText || ''));
      if (matched) {
        console.log(`PASS ${check.label}: ${check.path} contains /${check.pattern.source}/`);
      } else {
        failed = true;
        console.log(`FAIL ${check.label}: ${check.path} missing /${check.pattern.source}/`);
      }
    } catch (error) {
      failed = true;
      console.log(`FAIL ${check.label}: ${check.path} navigation error -> ${String(error)}`);
    }
  }

  try {
    const authMeResponse = await context.request.get(`${baseUrl}/api/auth/me`, {
      failOnStatusCode: false,
      timeout: 30000,
    });
    const authMeBody = await authMeResponse.text();
    if (/\"success\"/i.test(authMeBody)) {
      console.log(`PASS auth-me: /api/auth/me contains /"success"/ (status=${authMeResponse.status()})`);
    } else {
      failed = true;
      console.log(`FAIL auth-me: /api/auth/me missing /"success"/ (status=${authMeResponse.status()})`);
    }
  } catch (error) {
    failed = true;
    console.log(`FAIL auth-me: request error -> ${String(error)}`);
  }

  await browser.close();

  if (failed) {
    process.exit(1);
  }

  console.log('Parity walkthrough completed.');
}

run().catch((error) => {
  console.error(`Parity walkthrough failed: ${String(error)}`);
  process.exit(1);
});
