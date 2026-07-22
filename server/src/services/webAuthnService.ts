'use strict';

import { createHash, randomBytes } from 'crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type Base64URLString,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import appModForDb from '../app';
import constants from '../models/constants';
import type { WikitruthRequest } from '../types/http';
import { logEntryEvent } from './entryEventsService';
import { getRequestOrigin, requireCanonicalAuthOrigin } from './webAuthnConfigService';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

export type WebAuthnPurpose = 'registration' | 'authentication' | 'step_up' | 'passwordless_signup';

interface PasskeyUser {
  _id?: unknown;
  id?: unknown;
  username?: string;
  email?: string;
}

interface StoredCeremony {
  _id: unknown;
  purpose: WebAuthnPurpose;
  userId?: unknown;
  userHandle?: string;
  challengeHash: string;
  rpId: string;
  expectedOrigin: string;
  metadata?: Record<string, unknown>;
}

function userIdOf(user: PasskeyUser): string {
  return String(user._id || user.id || '');
}

function hashChallenge(challenge: string): string {
  return createHash('sha256').update(challenge, 'utf8').digest('hex');
}

function publicCredential(record: Record<string, any>) {
  return {
    id: String(record._id || ''),
    credentialId: String(record.credentialId || ''),
    name: String(record.name || 'Passkey'),
    transports: Array.isArray(record.transports) ? record.transports : [],
    deviceType: String(record.deviceType || 'singleDevice'),
    backedUp: Boolean(record.backedUp),
    status: String(record.status || 'active'),
    createDate: record.createDate || null,
    lastUsedAt: record.lastUsedAt || null,
    revokedAt: record.revokedAt || null,
  };
}

async function createCeremony(input: {
  purpose: WebAuthnPurpose;
  challenge: string;
  userId?: string;
  userHandle?: string;
  rpId: string;
  expectedOrigin: string;
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (input.userId) {
    await db.AuthCeremony.deleteMany({
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
    });
  }
  const ceremony = await db.AuthCeremony.create({
    purpose: input.purpose,
    challengeHash: hashChallenge(input.challenge),
    userId: input.userId || null,
    userHandle: input.userHandle || '',
    rpId: input.rpId,
    expectedOrigin: input.expectedOrigin,
    metadata: input.metadata || {},
    createDate: new Date(),
    expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
    consumedAt: null,
  });
  return String(ceremony._id);
}

async function consumeCeremony(id: unknown, purpose: WebAuthnPurpose): Promise<StoredCeremony> {
  const ceremony = await db.AuthCeremony.findOneAndUpdate(
    {
      _id: String(id || ''),
      purpose,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { new: false }
  ).lean();
  if (!ceremony) throw new Error('Authentication ceremony is invalid, expired, or already used');
  return ceremony as StoredCeremony;
}

function challengeMatches(storedHash: string) {
  return async (challenge: string): Promise<boolean> => hashChallenge(challenge) === storedHash;
}

async function auditPasskey(
  eventType: string,
  user: PasskeyUser,
  message: string,
  payload: Record<string, unknown>
): Promise<void> {
  await logEntryEvent({
    scope: 'privileged',
    eventType,
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'user',
    objectId: userIdOf(user),
    actorUserId: userIdOf(user),
    actorUsername: String(user.username || ''),
    message,
    payload,
  });
}

export async function listPasskeyCredentials(userId: string, includeRevoked = false) {
  const query: Record<string, unknown> = { userId };
  if (!includeRevoked) query.status = 'active';
  const credentials = await db.PasskeyCredential.find(query).sort({ createDate: 1 }).lean();
  return credentials.map(publicCredential);
}

export async function countActivePasskeys(userId: string): Promise<number> {
  return db.PasskeyCredential.countDocuments({ userId, status: 'active' });
}

export async function createPasskeyRegistrationOptions(req: WikitruthRequest, user: PasskeyUser) {
  const config = requireCanonicalAuthOrigin(req);
  const userId = userIdOf(user);
  if (!userId) throw new Error('Authentication required');
  const existing = await db.PasskeyCredential.find({
    userId,
    status: 'active',
    rpId: config.rpId,
  }).lean();
  const userHandle = String(existing[0]?.userHandle || randomBytes(32).toString('base64url'));
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userID: Buffer.from(userHandle, 'base64url'),
    userName: String(user.username || user.email || userId),
    userDisplayName: String(user.username || ''),
    attestationType: 'none',
    timeout: config.challengeTtlSeconds * 1000,
    excludeCredentials: existing.map((credential: Record<string, any>) => ({
      id: String(credential.credentialId) as Base64URLString,
      transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      requireResidentKey: true,
      userVerification: 'required',
    },
  });
  const ceremonyId = await createCeremony({
    purpose: 'registration',
    challenge: options.challenge,
    userId,
    userHandle,
    rpId: config.rpId,
    expectedOrigin: getRequestOrigin(req),
    ttlSeconds: config.challengeTtlSeconds,
  });
  return { ceremonyId, options };
}

export async function createPasswordlessSignupOptions(
  req: WikitruthRequest,
  identity: { username: string; email: string }
) {
  const config = requireCanonicalAuthOrigin(req);
  if (!config.passwordlessEnabled) throw new Error('Passwordless signup is disabled');
  const userHandle = randomBytes(32).toString('base64url');
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userID: Buffer.from(userHandle, 'base64url'),
    userName: identity.username,
    userDisplayName: identity.username,
    attestationType: 'none',
    timeout: config.challengeTtlSeconds * 1000,
    authenticatorSelection: {
      residentKey: 'required',
      requireResidentKey: true,
      userVerification: 'required',
    },
  });
  const ceremonyId = await createCeremony({
    purpose: 'passwordless_signup',
    challenge: options.challenge,
    userHandle,
    rpId: config.rpId,
    expectedOrigin: getRequestOrigin(req),
    ttlSeconds: config.challengeTtlSeconds,
    metadata: identity,
  });
  return { ceremonyId, options };
}

export async function verifyPasswordlessSignup(input: {
  req: WikitruthRequest;
  ceremonyId: unknown;
  response: RegistrationResponseJSON;
  name?: unknown;
}) {
  const config = requireCanonicalAuthOrigin(input.req);
  if (!config.passwordlessEnabled) throw new Error('Passwordless signup is disabled');
  const ceremony = await consumeCeremony(input.ceremonyId, 'passwordless_signup');
  const username = String(ceremony.metadata?.username || '').trim();
  const email = String(ceremony.metadata?.email || '')
    .trim()
    .toLowerCase();
  if (!username || !email || ceremony.rpId !== config.rpId)
    throw new Error('Passwordless signup ceremony is invalid');
  const duplicate = await db.User.findOne({ $or: [{ username }, { email }] }).lean();
  if (duplicate) throw new Error('Username or email is already registered');
  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: challengeMatches(ceremony.challengeHash),
    expectedOrigin: ceremony.expectedOrigin,
    expectedRPID: ceremony.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo?.userVerified) {
    throw new Error('Passkey signup could not be verified');
  }
  const requireVerification = Boolean(
    (input.req.app as unknown as { config?: { requireAccountVerification?: boolean } }).config
      ?.requireAccountVerification
  );
  let user: Record<string, any> | null = null;
  let account: Record<string, any> | null = null;
  try {
    const createdUser = await db.User.create({
      isActive: 'yes',
      username,
      email,
      passwordLoginDisabled: true,
      search: [username, email],
      onboarding: {
        contributor: { completed: false },
        reviewer: { completed: false },
      },
    });
    user = createdUser;
    const createdAccount = await db.Account.create({
      isVerified: requireVerification ? 'no' : 'yes',
      'name.full': username,
      user: { id: createdUser._id, name: username },
      search: [username],
    });
    account = createdAccount;
    createdUser.roles ||= {};
    createdUser.roles.account = createdAccount._id;
    await createdUser.save();
    const info = verification.registrationInfo;
    const now = new Date();
    const credential = await db.PasskeyCredential.create({
      userId: createdUser._id,
      credentialId: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey),
      userHandle: ceremony.userHandle,
      rpId: ceremony.rpId,
      counter: info.credential.counter,
      transports: input.response.response.transports || info.credential.transports || [],
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      aaguid: info.aaguid,
      name:
        String(input.name || '')
          .trim()
          .slice(0, 80) || 'Passkey',
      status: 'active',
      createDate: now,
      editDate: now,
    });
    await auditPasskey(
      'auth.passkey.passwordless-signup',
      user as PasskeyUser,
      'Created an account with a passkey',
      {
        passkeyCredentialId: String(credential._id),
        rpId: ceremony.rpId,
      }
    );
    return {
      user,
      credential: publicCredential(credential.toObject ? credential.toObject() : credential),
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (account?._id) await db.Account.findByIdAndDelete(account._id).catch(() => undefined);
    if (user?._id) await db.User.findByIdAndDelete(user._id).catch(() => undefined);
    throw error;
  }
}

export async function verifyPasskeyRegistration(input: {
  req: WikitruthRequest;
  user: PasskeyUser;
  ceremonyId: unknown;
  response: RegistrationResponseJSON;
  name?: unknown;
}) {
  const config = requireCanonicalAuthOrigin(input.req);
  const userId = userIdOf(input.user);
  const ceremony = await consumeCeremony(input.ceremonyId, 'registration');
  if (String(ceremony.userId || '') !== userId || ceremony.rpId !== config.rpId) {
    throw new Error('Passkey registration ceremony does not belong to this account');
  }
  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: challengeMatches(ceremony.challengeHash),
    expectedOrigin: ceremony.expectedOrigin,
    expectedRPID: ceremony.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo?.userVerified) {
    throw new Error('Passkey registration could not be verified');
  }
  const info = verification.registrationInfo;
  const now = new Date();
  const credential = await db.PasskeyCredential.create({
    userId,
    credentialId: info.credential.id,
    publicKey: Buffer.from(info.credential.publicKey),
    userHandle: ceremony.userHandle,
    rpId: ceremony.rpId,
    counter: info.credential.counter,
    transports: input.response.response.transports || info.credential.transports || [],
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    aaguid: info.aaguid,
    name:
      String(input.name || '')
        .trim()
        .slice(0, 80) || 'Passkey',
    status: 'active',
    createDate: now,
    editDate: now,
  });
  await auditPasskey('auth.passkey.registered', input.user, 'Registered a passkey', {
    passkeyCredentialId: String(credential._id),
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    rpId: ceremony.rpId,
  });
  return publicCredential(credential.toObject ? credential.toObject() : credential);
}

export async function createPasskeyAuthenticationOptions(
  req: WikitruthRequest,
  purpose: 'authentication' | 'step_up',
  user?: PasskeyUser
) {
  const config = requireCanonicalAuthOrigin(req);
  const userId = user ? userIdOf(user) : '';
  const credentials = userId
    ? await db.PasskeyCredential.find({ userId, status: 'active', rpId: config.rpId }).lean()
    : [];
  if (purpose === 'step_up' && credentials.length === 0)
    throw new Error('Register a passkey before continuing');
  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    timeout: config.challengeTtlSeconds * 1000,
    userVerification: 'required',
    ...(purpose === 'step_up'
      ? {
          allowCredentials: credentials.map((credential: Record<string, any>) => ({
            id: String(credential.credentialId) as Base64URLString,
            transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
          })),
        }
      : {}),
  });
  const ceremonyId = await createCeremony({
    purpose,
    challenge: options.challenge,
    userId: userId || undefined,
    rpId: config.rpId,
    expectedOrigin: getRequestOrigin(req),
    ttlSeconds: config.challengeTtlSeconds,
  });
  return { ceremonyId, options };
}

export async function verifyPasskeyAuthentication(input: {
  req: WikitruthRequest;
  ceremonyId: unknown;
  purpose: 'authentication' | 'step_up';
  response: AuthenticationResponseJSON;
  expectedUser?: PasskeyUser;
}) {
  const config = requireCanonicalAuthOrigin(input.req);
  const ceremony = await consumeCeremony(input.ceremonyId, input.purpose);
  if (ceremony.rpId !== config.rpId)
    throw new Error('Passkey authentication relying party does not match');
  const credential = await db.PasskeyCredential.findOne({
    credentialId: input.response.id,
    rpId: ceremony.rpId,
    status: 'active',
  }).select('+publicKey');
  if (!credential) throw new Error('Passkey is not registered or has been revoked');
  const expectedUserId = input.expectedUser
    ? userIdOf(input.expectedUser)
    : String(ceremony.userId || '');
  if (expectedUserId && String(credential.userId) !== expectedUserId) {
    throw new Error('Passkey does not belong to the authenticated account');
  }
  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: challengeMatches(ceremony.challengeHash),
    expectedOrigin: ceremony.expectedOrigin,
    expectedRPID: ceremony.rpId,
    credential: {
      id: String(credential.credentialId) as Base64URLString,
      publicKey: new Uint8Array(credential.publicKey),
      counter: Number(credential.counter || 0),
      transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
    },
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.authenticationInfo.userVerified) {
    throw new Error('Passkey authentication could not be verified');
  }
  credential.counter = verification.authenticationInfo.newCounter;
  credential.backedUp = verification.authenticationInfo.credentialBackedUp;
  credential.deviceType = verification.authenticationInfo.credentialDeviceType;
  credential.lastUsedAt = new Date();
  credential.editDate = new Date();
  await credential.save();
  const user = await db.User.findById(credential.userId);
  if (!user || (user.isActive && user.isActive !== 'yes')) throw new Error('Account is not active');
  await auditPasskey(
    input.purpose === 'step_up' ? 'auth.passkey.step-up' : 'auth.passkey.authenticated',
    user,
    input.purpose === 'step_up'
      ? 'Confirmed a privileged action with a passkey'
      : 'Authenticated with a passkey',
    { passkeyCredentialId: String(credential._id), rpId: ceremony.rpId }
  );
  return {
    user,
    credential: publicCredential(credential.toObject()),
    verifiedAt: new Date().toISOString(),
  };
}

export async function renamePasskey(user: PasskeyUser, credentialId: string, name: unknown) {
  const normalized = String(name || '')
    .trim()
    .slice(0, 80);
  if (normalized.length < 2) throw new Error('Passkey name must be at least two characters');
  const credential = await db.PasskeyCredential.findOneAndUpdate(
    { _id: credentialId, userId: userIdOf(user), status: 'active' },
    { $set: { name: normalized, editDate: new Date() } },
    { new: true }
  ).lean();
  if (!credential) throw new Error('Passkey not found');
  await auditPasskey('auth.passkey.renamed', user, 'Renamed a passkey', {
    passkeyCredentialId: credentialId,
  });
  return publicCredential(credential);
}

export async function revokePasskey(user: PasskeyUser, credentialId: string) {
  const now = new Date();
  const credential = await db.PasskeyCredential.findOneAndUpdate(
    { _id: credentialId, userId: userIdOf(user), status: 'active' },
    { $set: { status: 'revoked', revokedAt: now, revokedByUserId: userIdOf(user), editDate: now } },
    { new: true }
  ).lean();
  if (!credential) throw new Error('Passkey not found');
  await auditPasskey('auth.passkey.revoked', user, 'Revoked a passkey', {
    passkeyCredentialId: credentialId,
  });
  return publicCredential(credential);
}
