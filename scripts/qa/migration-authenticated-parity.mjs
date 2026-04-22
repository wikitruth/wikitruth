#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';
const explicitOutDir = process.argv[3] || '';
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = explicitOutDir || path.join('docs', 'qa', 'artifacts', `parity-authenticated-${runStamp}`);

const providedUsername = String(
  process.env.WT_PARITY_USERNAME || process.env.WT_PARITY_PRIVILEGED_USERNAME || '',
).trim();
const providedPassword = String(
  process.env.WT_PARITY_PASSWORD || process.env.WT_PARITY_PRIVILEGED_PASSWORD || '',
).trim();
const providedEmail = String(
  process.env.WT_PARITY_EMAIL || process.env.WT_PARITY_PRIVILEGED_EMAIL || '',
).trim();

const generatedToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const generatedCredentials = {
  username: `parity_${generatedToken}`.slice(0, 22),
  email: `parity.${generatedToken}@example.test`,
  password: `Parity!${generatedToken}A1`,
};

const credentials = {
  username: providedUsername || generatedCredentials.username,
  password: providedPassword || generatedCredentials.password,
  email: providedEmail || generatedCredentials.email,
};

const FAMILY_ORDER = ['topic', 'argument', 'question', 'answer', 'issue', 'opinion', 'artifact'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function safeFileLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function bucketKeyFromObjectName(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'comment') {
    return 'opinion';
  }
  if (FAMILY_ORDER.includes(normalized)) {
    return normalized;
  }
  return '';
}

function collectHomeBuckets(payload) {
  const buckets = {
    topic: [],
    argument: [],
    question: [],
    answer: [],
    issue: [],
    opinion: [],
    artifact: [],
  };

  const directBucketMap = {
    topic: 'topics',
    argument: 'arguments',
    question: 'questions',
    answer: 'answers',
    issue: 'issues',
    opinion: 'opinions',
    artifact: 'artifacts',
  };

  for (const family of FAMILY_ORDER) {
    const key = directBucketMap[family];
    const entries = Array.isArray(payload?.[key]) ? payload[key] : [];
    for (const entry of entries) {
      if (entry && entry._id) {
        buckets[family].push(entry);
      }
    }
  }

  const entrySet = Array.isArray(payload?.entrySet) ? payload.entrySet : [];
  for (const group of entrySet) {
    const entries = Array.isArray(group?.entries) ? group.entries : [];
    for (const entry of entries) {
      if (!entry || !entry._id) {
        continue;
      }
      const family = bucketKeyFromObjectName(entry.objectName);
      if (!family) {
        continue;
      }
      if (!buckets[family].some((candidate) => String(candidate._id) === String(entry._id))) {
        buckets[family].push(entry);
      }
    }
  }

  return buckets;
}

function buildEntryPair(family, entry) {
  const id = encodeURIComponent(String(entry._id || ''));
  const friendly = encodeURIComponent(String(entry.friendlyUrl || entry.title || entry._id || ''));

  if (family === 'answer') {
    return {
      family,
      modern: `/answers/entry/${id}`,
      legacy: `/legacy/answer/${friendly}/${id}`,
      id: String(entry._id),
      friendly: String(entry.friendlyUrl || entry.title || entry._id),
      title: String(entry.title || ''),
    };
  }

  const familyMap = {
    topic: { modernPrefix: '/topics/entry', legacyPrefix: '/legacy/topic' },
    argument: { modernPrefix: '/arguments/entry', legacyPrefix: '/legacy/argument' },
    question: { modernPrefix: '/questions/entry', legacyPrefix: '/legacy/question' },
    issue: { modernPrefix: '/issues/entry', legacyPrefix: '/legacy/issue' },
    opinion: { modernPrefix: '/opinions/entry', legacyPrefix: '/legacy/opinion' },
    artifact: { modernPrefix: '/artifacts/entry', legacyPrefix: '/legacy/artifact' },
  };

  const routes = familyMap[family];
  if (!routes) {
    return null;
  }

  return {
    family,
    modern: `${routes.modernPrefix}/${friendly}/${id}`,
    legacy: `${routes.legacyPrefix}/${friendly}/${id}`,
    id: String(entry._id),
    friendly: String(entry.friendlyUrl || entry.title || entry._id),
    title: String(entry.title || ''),
  };
}

function inferAvailableRoles(user) {
  const roles = ['reader', 'contributor'];
  const roleSet = user && typeof user.roles === 'object' ? user.roles : {};
  if (roleSet?.screener) {
    roles.push('screener');
  }
  if (roleSet?.reviewer) {
    roles.push('reviewer');
  }
  if (roleSet?.admin) {
    roles.push('admin');
  }
  return roles;
}

function extractRoleSignals(menuItems) {
  const haystack = menuItems.join('\n').toLowerCase();
  return {
    screeningStatus: haystack.includes('screening status'),
    takeOwnership: haystack.includes('take ownership'),
    deleteEntry: haystack.includes('delete'),
    convert: haystack.includes('convert'),
    signal: haystack.includes('signal for review'),
    appeal: haystack.includes('appeal'),
  };
}

async function getAuthState(context) {
  const response = await context.request.get(`${baseUrl}/api/auth/me`, {
    failOnStatusCode: false,
    timeout: 30000,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  return {
    status: response.status(),
    payload,
  };
}

async function isSignedIn(context) {
  const authState = await getAuthState(context);
  return Boolean(authState.payload?.success && authState.payload?.user?.username);
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) {
      continue;
    }
    try {
      await locator.waitFor({ state: 'visible', timeout: 3500 });
      await locator.click({ timeout: 3500 });
      await page.waitForTimeout(250);
      return selector;
    } catch (_error) {
      // Try next selector.
    }
  }
  return '';
}

async function readVisibleDropdownMenuItems(page) {
  return page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const menus = Array.from(document.querySelectorAll('ul.dropdown-menu')).filter((menu) => {
      const style = window.getComputedStyle(menu);
      const rect = menu.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });

    const menu = menus[menus.length - 1];
    if (!menu) {
      return [];
    }

    return Array.from(menu.querySelectorAll('li'))
      .map((item) => normalize(item.textContent))
      .filter(Boolean)
      .filter((item) => item !== '|');
  });
}

async function extractBreadcrumbText(page) {
  const selectors = ['nav[aria-label="breadcrumb"]', '.wt-breadcrumb', '.breadcrumb'];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) {
      continue;
    }
    try {
      const text = await locator.innerText({ timeout: 2500 });
      const normalized = normalizeText(text);
      if (normalized) {
        return normalized;
      }
    } catch (_error) {
      // Try next selector.
    }
  }
  return '';
}

async function capture(page, absoluteUrl, screenshotPath) {
  await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

async function openModernAccountMenu(page) {
  return clickFirstVisible(page, [
    'button[aria-controls="header-user-menu"]',
    'button[aria-label^="Account menu"]',
    '.navbar-nav.navbar-right li.dropdown > button',
  ]);
}

async function openLegacyAccountMenu(page) {
  return clickFirstVisible(page, [
    '.navbar-nav.navbar-right > li.dropdown > a.dropdown-toggle',
    '.navbar-nav.navbar-right li.dropdown a.dropdown-toggle',
  ]);
}

async function openModernEntryActionsMenu(page) {
  return clickFirstVisible(page, [
    'button:has-text("Actions")',
    '.entry-actions button.dropdown-toggle',
    '.dropdown button.dropdown-toggle:has-text("Actions")',
  ]);
}

async function openLegacyEntryActionsMenu(page) {
  return clickFirstVisible(page, [
    '.wt-entry-options-container a[title="See more options"]',
    '.wt-entry-options-container .dropdown a.dropdown-toggle:has-text("more")',
    '.wt-entry-options-container .dropdown a.dropdown-toggle',
  ]);
}

async function tryLoginViaModern(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });
  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);

  const submitButton = page.getByRole('button', { name: /^sign in$/i });
  if ((await submitButton.count()) > 0) {
    await submitButton.first().click();
  } else {
    await page.locator('button[type="submit"], .btn-login').first().click();
  }

  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 18000 }),
    sleep(2500),
  ]).catch(() => {});
  await page.waitForTimeout(900);

  return isSignedIn(page.context());
}

async function trySignupViaModern(page) {
  await page.goto(`${baseUrl}/signup`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });

  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.fill('input[name="confirmPassword"]', credentials.password);

  const terms = page.locator('input[name="agreeToTerms"]').first();
  if ((await terms.count()) > 0) {
    await terms.check({ force: true });
  }

  const createButton = page.getByRole('button', { name: /create account/i });
  if ((await createButton.count()) > 0) {
    await createButton.first().click();
  } else {
    await page.locator('button[type="submit"]').first().click();
  }

  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 22000 }),
    sleep(3000),
  ]).catch(() => {});
  await page.waitForTimeout(1200);

  return isSignedIn(page.context());
}

async function ensureSignedIn(page, context) {
  if (await isSignedIn(context)) {
    return { mode: 'existing-session', success: true };
  }

  if (providedUsername && providedPassword) {
    const loggedIn = await tryLoginViaModern(page);
    return { mode: 'provided-login', success: loggedIn };
  }

  const created = await trySignupViaModern(page);
  if (created) {
    return { mode: 'generated-signup', success: true };
  }

  const loggedIn = await tryLoginViaModern(page);
  return { mode: 'generated-login-fallback', success: loggedIn };
}

async function readCsrfToken(context) {
  const cookies = await context.cookies(baseUrl);
  const csrfCookie = cookies.find((cookie) => cookie.name === '_csrfToken');
  return csrfCookie ? decodeURIComponent(String(csrfCookie.value || '')) : '';
}

async function switchRole(context, role) {
  const csrfToken = await readCsrfToken(context);
  const response = await context.request.post(`${baseUrl}/api/auth/role-switch`, {
    failOnStatusCode: false,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    data: { role },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  return {
    role,
    status: response.status(),
    success: Boolean(payload?.success),
    payload,
  };
}

async function captureEntryPairEvidence(page, pair) {
  const familySlug = safeFileLabel(pair.family);
  const modernBasePath = path.join(outDir, `${familySlug}-modern.png`);
  const legacyBasePath = path.join(outDir, `${familySlug}-legacy.png`);
  const modernActionsPath = path.join(outDir, `${familySlug}-modern-actions.png`);
  const legacyActionsPath = path.join(outDir, `${familySlug}-legacy-actions.png`);
  const modernUrl = `${baseUrl}${pair.modern}`;
  const legacyUrl = `${baseUrl}${pair.legacy}`;

  const result = {
    family: pair.family,
    id: pair.id,
    friendly: pair.friendly,
    title: pair.title,
    modernUrl,
    legacyUrl,
    modernFile: modernBasePath,
    legacyFile: legacyBasePath,
    modernActionsFile: modernActionsPath,
    legacyActionsFile: legacyActionsPath,
    modernBreadcrumb: '',
    legacyBreadcrumb: '',
    modernActions: [],
    legacyActions: [],
    errors: [],
  };

  try {
    await capture(page, modernUrl, modernBasePath);
    result.modernBreadcrumb = await extractBreadcrumbText(page);
    const modernActionSelector = await openModernEntryActionsMenu(page);
    if (modernActionSelector) {
      result.modernActions = await readVisibleDropdownMenuItems(page);
      await page.screenshot({ path: modernActionsPath, fullPage: true });
    }
  } catch (error) {
    result.errors.push(`modern:${String(error)}`);
  }

  try {
    await capture(page, legacyUrl, legacyBasePath);
    result.legacyBreadcrumb = await extractBreadcrumbText(page);
    const legacyActionSelector = await openLegacyEntryActionsMenu(page);
    if (legacyActionSelector) {
      result.legacyActions = await readVisibleDropdownMenuItems(page);
      await page.screenshot({ path: legacyActionsPath, fullPage: true });
    }
  } catch (error) {
    result.errors.push(`legacy:${String(error)}`);
  }

  return result;
}

async function captureStyleStateEvidence(page) {
  const result = {
    modernHoverFile: path.join(outDir, 'style-state-modern-hover.png'),
    modernFocusFile: path.join(outDir, 'style-state-modern-focus.png'),
    legacyHoverFile: path.join(outDir, 'style-state-legacy-hover.png'),
    legacyFocusFile: path.join(outDir, 'style-state-legacy-focus.png'),
    errors: [],
  };

  try {
    await page.goto(`${baseUrl}/explore`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(900);
    const exploreLink = page.locator('a[title="Explore"]').first();
    if ((await exploreLink.count()) > 0) {
      await exploreLink.hover();
      await page.screenshot({ path: result.modernHoverFile, fullPage: true });
      await exploreLink.focus();
      await page.screenshot({ path: result.modernFocusFile, fullPage: true });
    }
  } catch (error) {
    result.errors.push(`modern:${String(error)}`);
  }

  try {
    await page.goto(`${baseUrl}/legacy/explore`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(900);
    const legacyExploreLink = page.locator('a[title="Explore"]').first();
    if ((await legacyExploreLink.count()) > 0) {
      await legacyExploreLink.hover();
      await page.screenshot({ path: result.legacyHoverFile, fullPage: true });
      await legacyExploreLink.focus();
      await page.screenshot({ path: result.legacyFocusFile, fullPage: true });
    }
  } catch (error) {
    result.errors.push(`legacy:${String(error)}`);
  }

  return result;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 960 },
  });
  const page = await context.newPage();

  const manifest = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    outDir,
    auth: {
      mode: '',
      usedProvidedCredentials: Boolean(providedUsername && providedPassword),
      username: credentials.username,
      success: false,
      availableRoles: [],
      activeRole: '',
    },
    accountMenus: {
      modern: {
        screenshot: path.join(outDir, 'account-menu-modern.png'),
        menuItems: [],
      },
      legacy: {
        screenshot: path.join(outDir, 'account-menu-legacy.png'),
        menuItems: [],
      },
    },
    entries: [],
    roleChecks: [],
    styleStates: null,
  };

  const authOutcome = await ensureSignedIn(page, context);
  manifest.auth.mode = authOutcome.mode;
  manifest.auth.success = Boolean(authOutcome.success);

  if (!authOutcome.success) {
    await browser.close();
    throw new Error(
      'Unable to authenticate for signed-in parity. Provide WT_PARITY_USERNAME/WT_PARITY_PASSWORD or ensure signup is available.'
    );
  }

  const authState = await getAuthState(context);
  const authUser = authState.payload?.user || null;
  manifest.auth.activeRole = String(authState.payload?.activeRole || '');
  manifest.auth.availableRoles = inferAvailableRoles(authUser);

  await capture(page, `${baseUrl}/explore`, manifest.accountMenus.modern.screenshot);
  await openModernAccountMenu(page);
  manifest.accountMenus.modern.menuItems = await readVisibleDropdownMenuItems(page);
  await page.screenshot({ path: manifest.accountMenus.modern.screenshot, fullPage: true });

  await capture(page, `${baseUrl}/legacy/explore`, manifest.accountMenus.legacy.screenshot);
  await openLegacyAccountMenu(page);
  manifest.accountMenus.legacy.menuItems = await readVisibleDropdownMenuItems(page);
  await page.screenshot({ path: manifest.accountMenus.legacy.screenshot, fullPage: true });

  const homeResponse = await context.request.get(`${baseUrl}/api/home`, {
    failOnStatusCode: false,
    timeout: 30000,
  });

  let homePayload = {};
  if (homeResponse.ok()) {
    try {
      homePayload = await homeResponse.json();
    } catch (_error) {
      homePayload = {};
    }
  }

  const buckets = collectHomeBuckets(homePayload);
  const entryPairs = [];
  for (const family of FAMILY_ORDER) {
    const candidate = buckets[family]?.[0];
    if (!candidate) {
      continue;
    }
    const pair = buildEntryPair(family, candidate);
    if (pair) {
      entryPairs.push(pair);
    }
  }

  for (const pair of entryPairs) {
    const entryEvidence = await captureEntryPairEvidence(page, pair);
    manifest.entries.push(entryEvidence);
    const modernState = entryEvidence.modernActions.length > 0 ? 'actions' : 'no-actions';
    const legacyState = entryEvidence.legacyActions.length > 0 ? 'actions' : 'no-actions';
    console.log(
      `Captured ${pair.family} parity: modern=${modernState} legacy=${legacyState} errors=${entryEvidence.errors.length}`
    );
  }

  const roleEntryCandidate =
    manifest.entries.find((entry) => entry.family === 'argument') ||
    manifest.entries.find((entry) => entry.family === 'topic') ||
    manifest.entries[0];
  if (roleEntryCandidate) {
    for (const role of manifest.auth.availableRoles) {
      const roleSwitch = await switchRole(context, role);
      const roleRecord = {
        role,
        switch: roleSwitch,
        screenshot: path.join(outDir, `role-${safeFileLabel(role)}-actions.png`),
        menuItems: [],
        signals: {},
      };

      if (roleSwitch.success) {
        await page.goto(roleEntryCandidate.modernUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1100);
        let openedSelector = await openModernEntryActionsMenu(page);
        if (!openedSelector) {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForTimeout(900);
          openedSelector = await openModernEntryActionsMenu(page);
        }

        if (openedSelector) {
          roleRecord.menuItems = await readVisibleDropdownMenuItems(page);
          if (roleRecord.menuItems.length === 0) {
            await page.waitForTimeout(300);
            await openModernEntryActionsMenu(page);
            roleRecord.menuItems = await readVisibleDropdownMenuItems(page);
          }
        }
        roleRecord.signals = extractRoleSignals(roleRecord.menuItems);
        await page.screenshot({ path: roleRecord.screenshot, fullPage: true });
      }

      manifest.roleChecks.push(roleRecord);
    }
  }

  manifest.styleStates = await captureStyleStateEvidence(page);

  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await browser.close();

  console.log(`Authenticated parity capture completed.`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(`Authenticated parity capture failed: ${String(error)}`);
  process.exit(1);
});
