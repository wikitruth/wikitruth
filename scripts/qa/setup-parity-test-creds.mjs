#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { request } from 'playwright';

const baseUrl = process.argv[2] || process.env.WT_BASE_URL || 'https://127.0.0.1:9443';
const wantsHelp = process.argv.includes('--help') || process.argv.includes('-h');
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts');
const outFile = path.join(outDir, 'parity-test-creds-last-run.json');

function asBool(value, fallback = false) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function printHelp() {
  console.log(`Usage:
  node scripts/qa/setup-parity-test-creds.mjs [baseUrl] [outDir]

Required environment:
  WT_ADMIN_USERNAME
  WT_ADMIN_PASSWORD

Credential environment (recommended):
  WT_PARITY_TEST_PASSWORD                # shared fallback password for parity users
  WT_PARITY_READER_USERNAME              # default: wt_parity_reader
  WT_PARITY_READER_EMAIL                 # default: wt.parity.reader@example.test
  WT_PARITY_READER_PASSWORD              # optional, overrides shared password
  WT_PARITY_PRIVILEGED_USERNAME          # default: wt_parity_privileged
  WT_PARITY_PRIVILEGED_EMAIL             # default: wt.parity.privileged@example.test
  WT_PARITY_PRIVILEGED_PASSWORD          # optional, overrides shared password

Optional admin-role controls:
  WT_PARITY_ADMIN_RECORD_ID              # explicit Admin record ID to link for privileged user
  WT_PARITY_REQUIRE_ADMIN_ROLE           # 1=true: fail if admin role cannot be linked

Backward-compatible aliases:
  WT_PARITY_USERNAME / WT_PARITY_PASSWORD / WT_PARITY_EMAIL
`);
}

function fail(message) {
  console.error(`setup-parity-test-creds failed: ${message}`);
  process.exit(1);
}

if (wantsHelp) {
  printHelp();
  process.exit(0);
}

const adminUsername = String(process.env.WT_ADMIN_USERNAME || '').trim();
const adminPassword = String(process.env.WT_ADMIN_PASSWORD || '').trim();
if (!adminUsername || !adminPassword) {
  fail('WT_ADMIN_USERNAME and WT_ADMIN_PASSWORD are required.');
}

const sharedPassword = String(process.env.WT_PARITY_TEST_PASSWORD || '').trim();

const readerSpec = {
  key: 'reader',
  username: String(process.env.WT_PARITY_READER_USERNAME || 'wt_parity_reader').trim(),
  email: String(process.env.WT_PARITY_READER_EMAIL || 'wt.parity.reader@example.test').trim().toLowerCase(),
  password: String(process.env.WT_PARITY_READER_PASSWORD || sharedPassword).trim(),
  roles: { screener: false, reviewer: false },
};

const privilegedSpec = {
  key: 'privileged',
  username: String(process.env.WT_PARITY_PRIVILEGED_USERNAME || process.env.WT_PARITY_USERNAME || 'wt_parity_privileged').trim(),
  email: String(
    process.env.WT_PARITY_PRIVILEGED_EMAIL || process.env.WT_PARITY_EMAIL || 'wt.parity.privileged@example.test',
  )
    .trim()
    .toLowerCase(),
  password: String(process.env.WT_PARITY_PRIVILEGED_PASSWORD || process.env.WT_PARITY_PASSWORD || sharedPassword).trim(),
  roles: { screener: true, reviewer: true },
};

const specs = [readerSpec, privilegedSpec];
for (const spec of specs) {
  if (!spec.username || !spec.email || !spec.password) {
    fail(
      `Incomplete credential config for "${spec.key}". Set explicit env vars or provide WT_PARITY_TEST_PASSWORD.`,
    );
  }
  if (spec.password.length < 6) {
    fail(`Password for "${spec.key}" must be at least 6 characters.`);
  }
}

async function readCsrfToken(apiContext) {
  const state = await apiContext.storageState();
  const cookies = Array.isArray(state?.cookies) ? state.cookies : [];
  const match = cookies.find((cookie) => cookie.name === '_csrfToken');
  return match ? decodeURIComponent(String(match.value || '')) : '';
}

async function ensureCsrfCookie(apiContext) {
  await apiContext.get(`${baseUrl}/login`, { failOnStatusCode: false, timeout: 30000 });
}

async function apiRequest(apiContext, method, apiPath, body) {
  const isReadOnly = method === 'GET' || method === 'HEAD';
  const headers = {
    'Content-Type': 'application/json',
  };

  if (!isReadOnly) {
    const csrfToken = await readCsrfToken(apiContext);
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  const response = await apiContext.fetch(`${baseUrl}${apiPath}`, {
    method,
    headers,
    data: body,
    failOnStatusCode: false,
    timeout: 30000,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok()) {
    const detail = payload?.message || payload?.error?.message || response.statusText();
    throw new Error(`${method} ${apiPath} -> ${response.status()} ${detail}`);
  }

  return payload;
}

function findUser(users, spec) {
  const username = spec.username.toLowerCase();
  const email = spec.email.toLowerCase();
  return (
    users.find((user) => String(user?.username || '').trim().toLowerCase() === username) ||
    users.find((user) => String(user?.email || '').trim().toLowerCase() === email) ||
    null
  );
}

function redactPassword(value) {
  if (!value) {
    return '';
  }
  return '*'.repeat(Math.min(12, Math.max(6, value.length)));
}

async function upsertUser(apiContext, spec) {
  const users = await apiRequest(apiContext, 'GET', '/api/admin/users');
  let user = findUser(Array.isArray(users) ? users : [], spec);
  let created = false;

  if (!user) {
    const createdResponse = await apiRequest(apiContext, 'POST', '/api/admin/users', {
      username: spec.username,
      email: spec.email,
      password: spec.password,
      roles: spec.roles,
    });
    user = createdResponse?.user || null;
    created = true;
  }

  if (!user?._id) {
    const refreshedUsers = await apiRequest(apiContext, 'GET', '/api/admin/users');
    user = findUser(Array.isArray(refreshedUsers) ? refreshedUsers : [], spec);
  }

  if (!user?._id) {
    throw new Error(`Unable to resolve user id for ${spec.username}`);
  }

  await apiRequest(apiContext, 'PUT', `/api/admin/users/${encodeURIComponent(String(user._id))}/password`, {
    password: spec.password,
  });
  await apiRequest(apiContext, 'PUT', `/api/admin/users/${encodeURIComponent(String(user._id))}/roles`, {
    screener: Boolean(spec.roles?.screener),
    reviewer: Boolean(spec.roles?.reviewer),
  });

  const refreshed = await apiRequest(apiContext, 'GET', '/api/admin/users');
  const persisted = findUser(Array.isArray(refreshed) ? refreshed : [], spec) || user;

  return {
    created,
    user: persisted,
  };
}

function findUnlinkedAdminId(administrators) {
  for (const admin of administrators) {
    const linkedId = String(admin?.user?.id || '').trim();
    if (!linkedId) {
      return String(admin?._id || admin?.id || '').trim();
    }
  }
  return '';
}

async function ensurePrivilegedAdminRole(apiContext, privilegedUserId) {
  const requestedAdminId = String(process.env.WT_PARITY_ADMIN_RECORD_ID || '').trim();
  const requireAdminRole = asBool(process.env.WT_PARITY_REQUIRE_ADMIN_ROLE, false);
  const administrators = await apiRequest(apiContext, 'GET', '/api/admin/administrators');
  const rows = Array.isArray(administrators) ? administrators : [];
  let selectedAdminId = requestedAdminId;

  if (selectedAdminId) {
    const found = rows.some((admin) => String(admin?._id || admin?.id || '').trim() === selectedAdminId);
    if (!found) {
      throw new Error(`WT_PARITY_ADMIN_RECORD_ID not found: ${selectedAdminId}`);
    }
  } else {
    selectedAdminId = findUnlinkedAdminId(rows);
  }

  if (!selectedAdminId) {
    if (requireAdminRole) {
      throw new Error('No unlinked admin record available for privileged user.');
    }
    return {
      linked: false,
      reason: 'No unlinked admin record available. Set WT_PARITY_ADMIN_RECORD_ID or create a free admin record.',
      adminId: '',
    };
  }

  await apiRequest(apiContext, 'PUT', `/api/admin/users/${encodeURIComponent(privilegedUserId)}/role-admin`, {
    adminId: selectedAdminId,
  });

  return {
    linked: true,
    reason: '',
    adminId: selectedAdminId,
  };
}

async function main() {
  const apiContext = await request.newContext({
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  });

  try {
    await ensureCsrfCookie(apiContext);
    await apiRequest(apiContext, 'POST', '/api/auth/login', {
      username: adminUsername,
      password: adminPassword,
    });

    const me = await apiRequest(apiContext, 'GET', '/api/auth/me');
    if (!me?.success || !me?.user?.roles?.admin) {
      throw new Error('Provided admin credentials are valid but not admin-authorized.');
    }

    const readerResult = await upsertUser(apiContext, readerSpec);
    const privilegedResult = await upsertUser(apiContext, privilegedSpec);
    const adminLink = await ensurePrivilegedAdminRole(apiContext, String(privilegedResult.user?._id || ''));

    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      users: [
        {
          key: readerSpec.key,
          username: readerSpec.username,
          email: readerSpec.email,
          passwordHint: redactPassword(readerSpec.password),
          created: readerResult.created,
          userId: String(readerResult.user?._id || ''),
          roles: {
            screener: Boolean(readerResult.user?.roles?.screener),
            reviewer: Boolean(readerResult.user?.roles?.reviewer),
            admin: Boolean(readerResult.user?.roles?.admin),
          },
        },
        {
          key: privilegedSpec.key,
          username: privilegedSpec.username,
          email: privilegedSpec.email,
          passwordHint: redactPassword(privilegedSpec.password),
          created: privilegedResult.created,
          userId: String(privilegedResult.user?._id || ''),
          roles: {
            screener: Boolean(privilegedResult.user?.roles?.screener),
            reviewer: Boolean(privilegedResult.user?.roles?.reviewer),
            admin: Boolean(privilegedResult.user?.roles?.admin),
          },
        },
      ],
      adminLink,
      envHints: {
        WT_PARITY_USERNAME: privilegedSpec.username,
        WT_PARITY_PASSWORD: '<set to privileged password>',
        WT_PARITY_EMAIL: privilegedSpec.email,
        WT_PARITY_PRIVILEGED_USERNAME: privilegedSpec.username,
        WT_PARITY_PRIVILEGED_PASSWORD: '<set to privileged password>',
        WT_PARITY_READER_USERNAME: readerSpec.username,
        WT_PARITY_READER_PASSWORD: '<set to reader password>',
      },
    };

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

    console.log('Parity test credential setup completed.');
    console.log(`Summary: ${outFile}`);
    console.log(`Privileged parity login user: ${privilegedSpec.username}`);
    if (!adminLink.linked) {
      console.warn(`Admin role link skipped: ${adminLink.reason}`);
    }
  } finally {
    await apiContext.dispose();
  }
}

main().catch((error) => {
  fail(String(error));
});
