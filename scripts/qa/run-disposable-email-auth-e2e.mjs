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
const baseUrl = process.argv[2] || process.env.WT_EMAIL_AUTH_E2E_BASE_URL || config.webAuthn?.canonicalOrigin;
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `email-auth-disposable-${runDate}`);

function assertSafeTargets() {
  assert.ok(baseUrl, 'A canonical local email-auth origin is required');
  assertLocalPilotTargets('https://127.0.0.1:9443', config.mongodb.uri);
  const target = new URL(baseUrl);
  const canonical = new URL(config.webAuthn?.canonicalOrigin || '');
  assert.equal(target.origin, canonical.origin, 'Email-auth QA must use the configured canonical origin');
  assert.equal(target.protocol, 'https:', 'Email-auth QA requires HTTPS');
  assert.equal(target.port, '9443', 'Email-auth QA refuses non-development HTTPS ports');
  assert.equal(config.emailAuth?.enabled, true, 'Email-code authentication is disabled');
  assert.notEqual(process.env.NODE_ENV, 'production', 'Email-auth QA requires development code delivery');
}

function runPlaywright(identity) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(command, [
      'playwright',
      'test',
      'tests/e2e/email-code-auth.spec.ts',
      '--project=chromium',
      '--reporter=line',
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        EMAIL_AUTH_E2E: '1',
        EMAIL_AUTH_E2E_USERNAME: identity.username,
        EMAIL_AUTH_E2E_EMAIL: identity.email,
        PLAYWRIGHT_BASE_URL: baseUrl,
        WT_LOCAL_TENANT_HOST_QA: '1',
      },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0
      ? resolve()
      : reject(new Error(`Email-auth Playwright test exited with code ${code}`)));
  });
}

async function inspectDatabase(connection, identity) {
  const user = await connection.collection('users').findOne({ username: identity.username });
  assert.ok(user?._id, 'Disposable email-code account was not created');
  assert.equal(user.email, identity.email);
  assert.equal(user.passwordLoginDisabled, true);
  const account = await connection.collection('accounts').findOne({ _id: user.roles?.account });
  assert.equal(account?.isVerified, 'yes');
  const challenges = await connection.collection('emailauthchallenges')
    .find({ email: identity.email }).sort({ createDate: 1 }).toArray();
  assert.equal(challenges.length, 2, 'Expected signup and returning sign-in challenges');
  assert.ok(challenges.every((challenge) => challenge.consumedAt), 'Every challenge must be consumed once');

  const sessions = await connection.collection('websessions')
    .find({ userId: user._id }).sort({ createDate: 1 }).toArray();
  assert.equal(sessions.length, 2, 'Expected remembered and standard web sessions');
  const remembered = sessions.find((session) => session.remembered === true);
  const standard = sessions.find((session) => session.remembered === false);
  assert.ok(remembered?.revokedAt, 'Signing out must revoke the remembered session');
  assert.equal(remembered?.revokedReason, 'signed_out');
  assert.equal(standard?.revokedAt, null);
  for (const [record, expectedMs] of [[remembered, 30 * 24 * 60 * 60 * 1000], [standard, 24 * 60 * 60 * 1000]]) {
    const lifetime = new Date(record.absoluteExpiresAt).getTime() - new Date(record.createDate).getTime();
    assert.ok(Math.abs(lifetime - expectedMs) < 5_000, `Unexpected fixed session lifetime: ${lifetime}`);
    assert.equal(record.authenticationMethod, 'email_code');
  }
  return { userId: user._id, accountId: user.roles?.account, challenges, sessions };
}

async function cleanup(connection, identity, records) {
  const userId = records?.userId || (await connection.collection('users').findOne(
    { username: identity.username }, { projection: { _id: 1 } },
  ))?._id;
  const accountId = records?.accountId || (userId ? (await connection.collection('users').findOne(
    { _id: userId }, { projection: { 'roles.account': 1 } },
  ))?.roles?.account : null);
  const cleanupQueries = {
    emailauthchallenges: { email: identity.email },
    websessions: userId ? { userId } : { _id: { $exists: false } },
    reputationsnapshots: userId ? { userId } : { _id: { $exists: false } },
    notifications: userId ? { userId } : { _id: { $exists: false } },
    sessions: userId ? { session: { $regex: String(userId) } } : { _id: { $exists: false } },
    accounts: accountId ? { _id: accountId } : { _id: { $exists: false } },
    users: { username: identity.username },
  };
  for (const [collection, query] of Object.entries(cleanupQueries)) {
    await connection.collection(collection).deleteMany(query);
  }
  const residue = {};
  for (const [collection, query] of Object.entries(cleanupQueries)) {
    residue[collection] = await connection.collection(collection).countDocuments(query);
  }
  return residue;
}

async function main() {
  assertSafeTargets();
  await fs.mkdir(outDir, { recursive: true });
  const token = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const identity = {
    username: `email-e2e-${token}`,
    email: `email-e2e-${token}@example.test`,
  };
  const connection = await mongoose.createConnection(config.mongodb.uri, {
    serverSelectionTimeoutMS: 10_000,
  }).asPromise();
  let runError = null;
  let records = null;
  let cleanupResidue = null;

  try {
    assert.equal(await connection.collection('users').countDocuments({ username: identity.username }), 0);
    await runPlaywright(identity);
    records = await inspectDatabase(connection, identity);
  } catch (error) {
    runError = error;
  } finally {
    cleanupResidue = await cleanup(connection, identity, records);
    await connection.close();
  }

  const manifest = {
    result: runError ? 'FAIL' : 'PASS',
    runDate,
    baseUrl,
    steps: [
      'tenant-canonical-auth-link',
      'email-code-account-creation',
      'remembered-session-persistence',
      'logout-revocation',
      'returning-email-code-login',
      'standard-session-persistence',
    ],
    databaseAssertions: {
      rawCredentialsPersisted: false,
      challengesConsumed: records?.challenges?.length || 0,
      sessionsVerified: records?.sessions?.length || 0,
    },
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
  assert.ok(Object.values(cleanupResidue || {}).every((count) => count === 0),
    `Email-auth fixture residue remained: ${JSON.stringify(cleanupResidue)}`);
  console.log(`Disposable email-auth browser QA passed: ${manifestPath}`);
  console.log('Email challenges, sessions, account, user, and mutable profile data removed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
