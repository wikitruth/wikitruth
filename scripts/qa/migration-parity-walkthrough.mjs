#!/usr/bin/env node
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';

const basePageChecks = [
  { label: 'modern-home', path: '/', pattern: /Latest Posts|Explore/i },
  { label: 'legacy-home', path: '/legacy/', pattern: /Latest Posts|Explore/i },
  { label: 'modern-explore', path: '/explore', pattern: /Explore|Topics|Facts/i },
  { label: 'legacy-explore', path: '/legacy/explore', pattern: /Explore|Topics|Facts/i },
  { label: 'modern-auth-page', path: '/login', pattern: /Sign In|Login/i },
  { label: 'legacy-auth-page', path: '/legacy/login/', pattern: /Sign In|Login/i },
  { label: 'modern-admin-route', path: '/admin', pattern: /Sign In|Admin/i },
  { label: 'modern-moderation-route', path: '/admin/verdicts', pattern: /Sign In|Verdict|Moderation/i },
  { label: 'modern-app-alias', path: '/app/explore', pattern: /Explore|Topics|Facts/i },
  { label: 'modern-fixph-civic', path: '/civic', pattern: /Fix The Philippines|Accountability|public record/i },
];

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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveDynamicTopicChecks(context) {
  try {
    const homeResponse = await context.request.get(`${baseUrl}/api/home`, {
      failOnStatusCode: false,
      timeout: 30000,
    });
    if (!homeResponse.ok()) {
      return [];
    }

    const homePayload = await homeResponse.json();
    const topicCandidate = resolveTopicCandidateFromHome(homePayload);
    if (!topicCandidate || !topicCandidate._id) {
      return [];
    }

    const topicId = encodeURIComponent(String(topicCandidate._id));
    const topicFriendly = encodeURIComponent(String(topicCandidate.friendlyUrl || topicCandidate.title || topicCandidate._id));
    const expectedTopicTitle = String(topicCandidate.title || topicCandidate.friendlyUrl || 'Topic');
    const escapedTitle = escapeRegExp(expectedTopicTitle);

    return [
      {
        label: 'modern-topic-entry-dynamic',
        path: `/topics/entry/${topicFriendly}/${topicId}`,
        pattern: new RegExp(`${escapedTitle}|Topics|Reply`, 'i'),
      },
      {
        label: 'legacy-topic-entry-dynamic',
        path: `/legacy/topic/${topicFriendly}/${topicId}`,
        pattern: new RegExp(`${escapedTitle}|Topics|Reply`, 'i'),
      },
    ];
  } catch (_error) {
    return [];
  }
}

async function run() {
  console.log(`Running migration parity walkthrough against ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const dynamicTopicChecks = await resolveDynamicTopicChecks(context);
  const pageChecks = [...basePageChecks, ...dynamicTopicChecks];

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

  try {
    const civicResponse = await context.request.get(`${baseUrl}/api/civic/overview`, {
      failOnStatusCode: false,
      timeout: 30000,
    });
    const civicBody = await civicResponse.text();
    if (civicResponse.ok() && /"counts"|"recent"/i.test(civicBody)) {
      console.log(`PASS civic-overview: /api/civic/overview exposes the public accountability contract`);
    } else {
      failed = true;
      console.log(`FAIL civic-overview: unexpected response (status=${civicResponse.status()})`);
    }
  } catch (error) {
    failed = true;
    console.log(`FAIL civic-overview: request error -> ${String(error)}`);
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
