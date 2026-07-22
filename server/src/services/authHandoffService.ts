'use strict';

import { createHash, randomBytes } from 'crypto';
import appModForDb from '../app';
import { BUILT_IN_CIVIC_TENANTS } from '../config/civicTenants';
import constants from '../models/constants';
import type { WikitruthRequest } from '../types/http';
import {
  establishAuthenticatedSession,
  getAuthenticationAssurance,
  type AuthenticationMethod,
} from './authAssuranceService';
import { logEntryEvent } from './entryEventsService';
import {
  getRequestOrigin,
  normalizeTrustedOrigin,
  requireCanonicalAuthOrigin,
  safeRelativeReturnPath,
} from './webAuthnConfigService';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

function hashCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function domainsToOrigins(domains: unknown): string[] {
  if (!Array.isArray(domains)) return [];
  return domains
    .map(domain =>
      normalizeTrustedOrigin(
        `https://${String(domain || '')
          .trim()
          .toLowerCase()}`
      )
    )
    .filter(Boolean);
}

export async function listTrustedHandoffOrigins(req: WikitruthRequest): Promise<string[]> {
  const config = requireCanonicalAuthOrigin(req);
  const origins = new Set(config.trustedTenantOrigins);
  BUILT_IN_CIVIC_TENANTS.forEach(tenant =>
    domainsToOrigins(tenant.domains).forEach(origin => origins.add(origin))
  );
  if (db.CivicTenant?.find) {
    const tenants = await db.CivicTenant.find({ status: 'active' }).select('domains').lean();
    tenants.forEach((tenant: { domains?: unknown }) =>
      domainsToOrigins(tenant.domains).forEach(origin => origins.add(origin))
    );
  }
  origins.delete(config.canonicalOrigin);
  return Array.from(origins).sort();
}

export async function createAuthHandoff(
  req: WikitruthRequest,
  target: unknown,
  returnPath: unknown
) {
  const config = requireCanonicalAuthOrigin(req);
  if (!req.user) throw new Error('Authentication required');
  const targetOrigin = normalizeTrustedOrigin(target);
  const trustedOrigins = await listTrustedHandoffOrigins(req);
  if (!targetOrigin || !trustedOrigins.includes(targetOrigin))
    throw new Error('Authentication handoff target is not trusted');
  const code = randomBytes(32).toString('base64url');
  const assurance = getAuthenticationAssurance(req);
  const now = new Date();
  const normalizedReturnPath = safeRelativeReturnPath(returnPath);
  await db.AuthHandoff.create({
    codeHash: hashCode(code),
    userId: req.user._id || req.user.id,
    sourceOrigin: config.canonicalOrigin,
    targetOrigin,
    returnPath: normalizedReturnPath,
    authenticationMethod: assurance?.method || 'password',
    authenticatedAt: assurance?.authenticatedAt ? new Date(assurance.authenticatedAt) : now,
    passkeyVerifiedAt: assurance?.passkeyVerifiedAt ? new Date(assurance.passkeyVerifiedAt) : null,
    createDate: now,
    expiresAt: new Date(now.getTime() + config.handoffTtlSeconds * 1000),
    consumedAt: null,
  });
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'auth.handoff.created',
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'user',
    objectId: String(req.user._id || req.user.id || ''),
    actorUserId: String(req.user._id || req.user.id || ''),
    actorUsername: String(req.user.username || ''),
    message: 'Created a cross-domain authentication handoff',
    payload: { targetOrigin, returnPath: normalizedReturnPath },
  });
  const callback = new URL('/auth/handoff', targetOrigin);
  callback.searchParams.set('code', code);
  callback.searchParams.set('returnUrl', normalizedReturnPath);
  return { callbackUrl: callback.toString(), expiresIn: config.handoffTtlSeconds };
}

export async function consumeAuthHandoff(req: WikitruthRequest, rawCode: unknown) {
  const code = String(rawCode || '').trim();
  if (!/^[A-Za-z0-9_-]{40,}$/.test(code)) throw new Error('Authentication handoff code is invalid');
  const requestOrigin = getRequestOrigin(req);
  const browserOrigin = normalizeTrustedOrigin(req.get('origin'));
  if (!requestOrigin || (browserOrigin && browserOrigin !== requestOrigin)) {
    throw new Error('Authentication handoff origin does not match');
  }
  const handoff = await db.AuthHandoff.findOneAndUpdate(
    {
      codeHash: hashCode(code),
      targetOrigin: requestOrigin,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'before' }
  ).lean();
  if (!handoff)
    throw new Error(
      'Authentication handoff is invalid, expired, already used, or intended for another origin'
    );
  const user = await db.User.findById(handoff.userId);
  if (!user || (user.isActive && user.isActive !== 'yes')) throw new Error('Account is not active');
  await establishAuthenticatedSession(req, user, 'handoff', {
    authenticatedAt: new Date(handoff.authenticatedAt).toISOString(),
    ...(handoff.passkeyVerifiedAt
      ? { passkeyVerifiedAt: new Date(handoff.passkeyVerifiedAt).toISOString() }
      : {}),
  });
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'auth.handoff.consumed',
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'user',
    objectId: String(user._id || user.id || ''),
    actorUserId: String(user._id || user.id || ''),
    actorUsername: String(user.username || ''),
    message: 'Consumed a cross-domain authentication handoff',
    payload: { sourceOrigin: handoff.sourceOrigin, targetOrigin: requestOrigin },
  });
  return {
    user,
    returnPath: safeRelativeReturnPath(handoff.returnPath),
    sourceMethod: String(handoff.authenticationMethod || 'password') as AuthenticationMethod,
  };
}
