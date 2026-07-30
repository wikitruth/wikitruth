#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';
import { assertLocalPilotTargets } from './epistemic-pilot-support.mjs';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || process.env.WT_PASSKEY_E2E_BASE_URL || config.webAuthn?.canonicalOrigin;
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `passkey-disposable-${runDate}`);

function assertSafeTargets() {
  assert.ok(baseUrl, 'A canonical local passkey origin is required');
  assertLocalPilotTargets('https://127.0.0.1:9443', config.mongodb.uri);
  const target = new URL(baseUrl);
  const canonical = new URL(config.webAuthn?.canonicalOrigin || '');
  assert.equal(target.origin, canonical.origin, 'Passkey QA must use the configured canonical origin');
  assert.equal(target.protocol, 'https:', 'Passkey QA requires HTTPS');
  assert.equal(target.port, '9443', 'Passkey QA refuses non-development HTTPS ports');
  assert.equal(config.webAuthn?.enabled, true, 'Passkeys are disabled');
  assert.equal(config.webAuthn?.passwordlessEnabled, true, 'Passwordless signup is disabled');
}

function runPlaywright(username) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(command, [
      'playwright',
      'test',
      'tests/e2e/passkey-auth.spec.ts',
      '--project=chromium',
      '--reporter=line',
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PASSKEY_E2E: '1',
        PASSKEY_E2E_USERNAME: username,
        PLAYWRIGHT_BASE_URL: baseUrl,
      },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0
      ? resolve()
      : reject(new Error(`Passkey Playwright test exited with code ${code}`)));
  });
}

async function cleanup(connection, username) {
  const user = await connection.collection('users').findOne({ username }, { projection: { _id: 1, roles: 1 } });
  const userId = user?._id;
  const accountId = user?.roles?.account;
  const queries = {
    authceremonies: { 'metadata.username': username },
    passkeycredentials: userId ? { userId } : { _id: { $exists: false } },
    recoverycodesets: userId ? { userId } : { _id: { $exists: false } },
    reputationsnapshots: userId ? { userId } : { _id: { $exists: false } },
    notifications: userId ? { userId } : { _id: { $exists: false } },
    sessions: userId ? { session: { $regex: String(userId) } } : { _id: { $exists: false } },
    accounts: accountId ? { _id: accountId } : { _id: { $exists: false } },
    users: { username },
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

async function main() {
  assertSafeTargets();
  await fs.mkdir(outDir, { recursive: true });
  const username = `passkey-e2e-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const connection = await mongoose.createConnection(config.mongodb.uri, {
    serverSelectionTimeoutMS: 10_000,
  }).asPromise();
  let runError = null;
  let cleanupResidue = null;

  try {
    assert.equal(await connection.collection('users').countDocuments({ username }), 0);
    await runPlaywright(username);
  } catch (error) {
    runError = error;
  } finally {
    cleanupResidue = await cleanup(connection, username);
    await connection.close();
  }

  const manifest = {
    result: runError ? 'FAIL' : 'PASS',
    runDate,
    baseUrl,
    steps: [
      'passwordless-signup',
      'primary-passkey-registration',
      'backup-passkey-registration',
      'recovery-code-generation',
      'logout',
      'passwordless-sign-in',
      'assurance-verification',
    ],
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
  assert.ok(
    Object.values(cleanupResidue || {}).every((count) => count === 0),
    `Passkey fixture residue remained: ${JSON.stringify(cleanupResidue)}`,
  );
  console.log(`Disposable passkey browser QA passed: ${manifestPath}`);
  console.log('Passkey identity, credentials, recovery codes, sessions, and mutable profile data removed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
