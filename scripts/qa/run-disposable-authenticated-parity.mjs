#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.argv[2] || 'https://127.0.0.1:9443';
const runDate = new Date().toISOString().slice(0, 10);
const outDir = process.argv[3] || path.join('docs', 'qa', 'artifacts', `parity-authenticated-disposable-${runDate}`);

function runCapture(credentials) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/qa/migration-authenticated-parity.mjs',
      baseUrl,
      outDir,
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        WT_PARITY_USERNAME: credentials.username,
        WT_PARITY_PASSWORD: credentials.password,
        WT_PARITY_ALLOW_SIGNUP: 'false',
      },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Authenticated parity exited with code ${code}`)));
  });
}

async function createDisposableIdentity(connection) {
  const stamp = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
  const username = `wt_disposable_${stamp}`;
  const email = `${username}@example.test`;
  const password = `Wt!${crypto.randomBytes(12).toString('base64url')}9a`;
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const now = new Date();

  await connection.collection('accounts').insertOne({
    _id: accountId,
    user: { id: userId, name: username },
    isVerified: 'yes',
    name: { full: username },
    search: [username, email],
  });
  await connection.collection('admins').insertOne({
    _id: adminId,
    user: { id: userId, name: username },
    name: { full: username },
    groups: [],
    permissions: [],
    timeCreated: now,
    search: [username],
  });
  await connection.collection('users').insertOne({
    _id: userId,
    username,
    email,
    password: await bcrypt.hash(password, 10),
    isActive: 'yes',
    timeCreated: now,
    roles: { account: accountId, admin: adminId, screener: true, reviewer: true },
    onboarding: {
      contributor: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId },
      reviewer: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId, assignedDate: now },
    },
    search: [username, email],
  });
  return { username, email, password, userId, accountId, adminId };
}

async function removeDisposableIdentity(connection, identity) {
  if (!identity) return;
  await Promise.all([
    connection.collection('users').deleteOne({ _id: identity.userId }),
    connection.collection('accounts').deleteOne({ _id: identity.accountId }),
    connection.collection('admins').deleteOne({ _id: identity.adminId }),
  ]);
}

async function scrubManifest(identity) {
  const manifestPath = path.join(outDir, 'manifest.json');
  const raw = (await fs.readFile(manifestPath, 'utf8'))
    .split(identity.username).join('[redacted-disposable-user]')
    .split(identity.email).join('[redacted-disposable-email]');
  const manifest = JSON.parse(raw);
  manifest.auth.username = '[redacted-disposable-user]';
  manifest.auth.cleanup = { disposableRecordsRemoved: true, verifiedAfterRun: true };
  manifest.outDir = '[transient-screenshots-not-retained]';
  for (const menu of Object.values(manifest.accountMenus || {})) menu.screenshot = '[not-retained]';
  for (const entry of manifest.entries || []) {
    for (const key of ['modernFile', 'legacyFile', 'modernActionsFile', 'legacyActionsFile']) entry[key] = '[not-retained]';
  }
  for (const role of manifest.roleChecks || []) role.screenshot = '[not-retained]';
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { manifestPath, manifest };
}

async function main() {
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  let identity = null;
  let captureError = null;
  try {
    identity = await createDisposableIdentity(connection);
    await runCapture(identity);
  } catch (error) {
    captureError = error;
  } finally {
    await removeDisposableIdentity(connection, identity);
  }

  const residue = await connection.collection('users').countDocuments({ username: /^wt_disposable_/ });
  await connection.close();
  if (residue !== 0) throw new Error(`Disposable parity-user residue detected: ${residue}`);
  if (captureError) throw captureError;

  const { manifestPath, manifest } = await scrubManifest(identity);
  console.log(`Redacted authenticated parity manifest: ${manifestPath}`);
  console.log(`Roles checked: ${manifest.roleChecks.map((item) => item.role).join(', ')}`);
  console.log('Disposable user/account/admin cleanup verified.');
}

main().catch((error) => {
  console.error(`Disposable authenticated parity failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
