import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { request } from 'playwright';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function assertLocalPilotTargets(baseUrl, mongodbUri) {
  const webHost = new URL(baseUrl).hostname;
  assert.ok(LOCAL_HOSTS.has(webHost), `Pilot refuses non-local web host: ${webHost}`);
  assert.ok(!String(mongodbUri).startsWith('mongodb+srv:'), 'Pilot refuses mongodb+srv targets');
  const authority = String(mongodbUri).replace(/^mongodb:\/\//, '').split('/')[0].split('@').at(-1) || '';
  const databaseHosts = authority.split(',').map((part) => part.trim().replace(/^\[|\](?=:|$)/g, '').split(':')[0]);
  assert.ok(databaseHosts.length > 0 && databaseHosts.every((host) => LOCAL_HOSTS.has(host)),
    `Pilot refuses non-local MongoDB host(s): ${databaseHosts.join(', ')}`);
}

export function pilotStamp() {
  return `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

export async function insertPilotIdentity(connection, prefix, roles = {}) {
  const token = pilotStamp();
  const username = `${prefix}_${token}`.slice(0, 32);
  const email = `${username}@example.test`;
  const password = `Wt!${crypto.randomBytes(12).toString('base64url')}9a`;
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const adminId = roles.admin ? new mongoose.Types.ObjectId() : null;
  const now = new Date();
  await connection.collection('accounts').insertOne({
    _id: accountId,
    user: { id: userId, name: username },
    isVerified: 'yes',
    name: { full: username },
    search: [username, email],
  });
  if (adminId) {
    await connection.collection('admins').insertOne({
      _id: adminId,
      user: { id: userId, name: username },
      name: { full: username },
      groups: [],
      permissions: [],
      timeCreated: now,
      search: [username],
    });
  }
  await connection.collection('users').insertOne({
    _id: userId,
    username,
    email,
    password: await bcrypt.hash(password, 10),
    isActive: 'yes',
    timeCreated: now,
    roles: {
      account: accountId,
      ...(roles.reviewer ? { reviewer: true } : {}),
      ...(roles.screener ? { screener: true } : {}),
      ...(adminId ? { admin: adminId, reviewer: true, screener: true } : {}),
    },
    onboarding: {
      contributor: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId },
      reviewer: { completed: true, policyVersion: '2026-07-11', acknowledgements: [], completedDate: now, completedUserId: userId, assignedDate: now },
    },
    search: [username, email],
  });
  return { username, email, password, userId, accountId, adminId };
}

async function csrfToken(apiContext) {
  const state = await apiContext.storageState();
  const cookie = state.cookies?.find((item) => item.name === '_csrfToken');
  return cookie ? decodeURIComponent(String(cookie.value || '')) : '';
}

export async function apiCall(session, method, apiPath, body) {
  const readOnly = ['GET', 'HEAD'].includes(method);
  const token = readOnly ? '' : await csrfToken(session.context);
  const response = await session.context.fetch(`${session.baseUrl}${apiPath}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'x-csrf-token': token } : {}),
    },
    ...(typeof body === 'undefined' ? {} : { data: body }),
    failOnStatusCode: false,
    timeout: 30_000,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  if (!response.ok()) {
    throw new Error(`${method} ${apiPath} -> ${response.status()} ${payload?.message || response.statusText()}`);
  }
  return payload;
}

export async function authenticatedSession(baseUrl, identity) {
  const context = await request.newContext({ ignoreHTTPSErrors: true });
  const session = { baseUrl, context, identity };
  await context.get(`${baseUrl}/login`, { failOnStatusCode: false, timeout: 30_000 });
  const login = await apiCall(session, 'POST', '/api/v1/auth/login', {
    username: identity.username,
    password: identity.password,
  });
  assert.equal(login?.success, true, `Unable to authenticate ${identity.username}`);
  return session;
}

function fixtureQueries(fixture, identities) {
  const userIds = identities.map((identity) => identity.userId);
  const objectIds = [fixture.topicId, fixture.claimId, ...fixture.artifactIds, fixture.issueId, fixture.civicRecordId];
  return { userIds, objectIds };
}

export async function cleanupPilot(connection, fixture, identities) {
  const { userIds, objectIds } = fixtureQueries(fixture, identities);
  const accountIds = identities.map((identity) => identity.accountId);
  const adminIds = identities.map((identity) => identity.adminId).filter(Boolean);
  const targetStrings = objectIds.map(String);
  const sessionPattern = userIds.map(String).join('|');
  const cleanup = {
    civicentrylinks: { $or: [{ civicRecordId: fixture.civicRecordId }, { objectId: { $in: fixture.artifactIds } }] },
    verdictvotes: { objectId: fixture.claimId },
    readersignals: { objectId: fixture.claimId },
    appeals: { objectId: fixture.claimId },
    entryrevisions: { objectId: { $in: objectIds } },
    entryrevisioncounters: { key: { $in: objectIds.flatMap((id) => [1, 2, 6, 10, 40].map((type) => `${type}:${id}`)) } },
    notifications: { $or: [{ userId: { $in: userIds } }, { 'target.objectId': { $in: targetStrings } }] },
    reputationsnapshots: { userId: { $in: userIds } },
    realtimeevents: { 'target.objectId': { $in: targetStrings } },
    tenantmemberships: { userId: { $in: userIds } },
    civicrecords: { _id: fixture.civicRecordId },
    issues: { _id: fixture.issueId },
    artifacts: { _id: { $in: fixture.artifactIds } },
    arguments: { _id: fixture.claimId },
    topics: { _id: fixture.topicId },
    sessions: { session: { $regex: sessionPattern } },
    users: { _id: { $in: userIds } },
    accounts: { _id: { $in: accountIds } },
    admins: { _id: { $in: adminIds } },
  };
  for (const [collection, query] of Object.entries(cleanup)) {
    await connection.collection(collection).deleteMany(query);
  }
  const residue = {};
  for (const [collection, query] of Object.entries(cleanup)) {
    residue[collection] = await connection.collection(collection).countDocuments(query);
  }
  return residue;
}
