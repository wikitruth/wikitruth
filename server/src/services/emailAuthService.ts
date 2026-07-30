'use strict';

import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import appModForDb from '../app';
import type { WikitruthRequest } from '../types/http';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

export interface EmailAuthConfig {
  enabled: boolean;
  codeTtlSeconds: number;
  maximumAttempts: number;
  resendDelaySeconds: number;
  maximumRequestsPerEmailPerHour: number;
  maximumRequestsPerIpPerHour: number;
}

interface StoredChallenge {
  _id: unknown;
  challengeId: string;
  email: string;
  codeHash: string;
  linkTokenHash: string;
  completionTokenHash?: string;
  userId?: unknown;
  targetOrigin?: string;
  returnPath?: string;
  rememberMe?: boolean;
  attempts: number;
  maximumAttempts: number;
  createDate: Date;
  resendAvailableAt: Date;
  expiresAt: Date;
  verifiedAt?: Date | null;
  consumedAt?: Date | null;
  supersededAt?: Date | null;
}

interface ChallengeContext {
  challengeId: string;
  email: string;
  targetOrigin: string;
  returnPath: string;
  rememberMe: boolean;
}

export class EmailAuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'EMAIL_CODE_INVALID') {
    super(message);
    this.name = 'EmailAuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const DEFAULT_CONFIG: EmailAuthConfig = {
  enabled: true,
  codeTtlSeconds: 600,
  maximumAttempts: 5,
  resendDelaySeconds: 60,
  maximumRequestsPerEmailPerHour: 5,
  maximumRequestsPerIpPerHour: 20,
};

function positive(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getEmailAuthConfig(req: WikitruthRequest): EmailAuthConfig {
  const raw = (req.app as unknown as { config?: { emailAuth?: Partial<EmailAuthConfig> } }).config
    ?.emailAuth || {};
  return {
    enabled: raw.enabled !== false,
    codeTtlSeconds: positive(raw.codeTtlSeconds, DEFAULT_CONFIG.codeTtlSeconds),
    maximumAttempts: positive(raw.maximumAttempts, DEFAULT_CONFIG.maximumAttempts),
    resendDelaySeconds: positive(raw.resendDelaySeconds, DEFAULT_CONFIG.resendDelaySeconds),
    maximumRequestsPerEmailPerHour: positive(
      raw.maximumRequestsPerEmailPerHour,
      DEFAULT_CONFIG.maximumRequestsPerEmailPerHour
    ),
    maximumRequestsPerIpPerHour: positive(
      raw.maximumRequestsPerIpPerHour,
      DEFAULT_CONFIG.maximumRequestsPerIpPerHour
    ),
  };
}

function secret(req: WikitruthRequest): string {
  const value = String(
    (req.app as unknown as { config?: { cryptoKey?: string } }).config?.cryptoKey || ''
  );
  if (!value) throw new Error('Email authentication security configuration is unavailable');
  return value;
}

function digest(req: WikitruthRequest, namespace: string, value: string): string {
  return createHmac('sha256', secret(req))
    .update(`${namespace}:${value}`, 'utf8')
    .digest('hex');
}

function secureEqual(left: string, right: string): boolean {
  if (!/^[a-f\d]{64}$/i.test(left) || !/^[a-f\d]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function challengeContext(challenge: StoredChallenge): ChallengeContext {
  return {
    challengeId: challenge.challengeId,
    email: challenge.email,
    targetOrigin: String(challenge.targetOrigin || ''),
    returnPath: String(challenge.returnPath || '/'),
    rememberMe: Boolean(challenge.rememberMe),
  };
}

function genericInvalid(): EmailAuthError {
  return new EmailAuthError('The email code or secure link is invalid or expired');
}

export async function createEmailAuthChallenge(
  req: WikitruthRequest,
  input: {
    email: string;
    rememberMe: boolean;
    targetOrigin?: string;
    returnPath?: string;
  }
) {
  const config = getEmailAuthConfig(req);
  if (!config.enabled) throw new EmailAuthError('Email sign-in is unavailable', 503, 'EMAIL_AUTH_DISABLED');
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const requestIpHash = digest(req, 'email-auth-ip', String(req.ip || 'unknown'));
  const activeQuery = {
    email: input.email,
    consumedAt: null,
    supersededAt: null,
    expiresAt: { $gt: now },
  };
  const [emailCount, ipCount, recent] = await Promise.all([
    db.EmailAuthChallenge.countDocuments({ email: input.email, createDate: { $gt: hourAgo } }),
    db.EmailAuthChallenge.countDocuments({ requestIpHash, createDate: { $gt: hourAgo } }),
    db.EmailAuthChallenge.findOne(activeQuery).sort({ createDate: -1 }).lean(),
  ]);

  if (recent && new Date(recent.resendAvailableAt).getTime() > now.getTime()) {
    return {
      accepted: true,
      challengeId: String(recent.challengeId),
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((new Date(recent.resendAvailableAt).getTime() - now.getTime()) / 1000)
      ),
      expiresInSeconds: Math.max(
        1,
        Math.ceil((new Date(recent.expiresAt).getTime() - now.getTime()) / 1000)
      ),
      deliveryRequired: false,
    };
  }

  if (
    emailCount >= config.maximumRequestsPerEmailPerHour ||
    ipCount >= config.maximumRequestsPerIpPerHour
  ) {
    return {
      accepted: true,
      challengeId: recent ? String(recent.challengeId) : '',
      retryAfterSeconds: 60 * 60,
      expiresInSeconds: recent
        ? Math.max(1, Math.ceil((new Date(recent.expiresAt).getTime() - now.getTime()) / 1000))
        : config.codeTtlSeconds,
      deliveryRequired: false,
    };
  }

  await db.EmailAuthChallenge.updateMany(activeQuery, { $set: { supersededAt: now } });
  const user = await db.User.findOne({ email: input.email });
  const challengeId = randomBytes(24).toString('base64url');
  const code = randomInt(0, 1000000).toString().padStart(6, '0');
  const linkToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + config.codeTtlSeconds * 1000);
  const resendAvailableAt = new Date(now.getTime() + config.resendDelaySeconds * 1000);
  await db.EmailAuthChallenge.create({
    challengeId,
    email: input.email,
    codeHash: digest(req, `email-code:${challengeId}`, code),
    linkTokenHash: digest(req, `email-link:${challengeId}`, linkToken),
    completionTokenHash: '',
    userId: user?._id || null,
    requestIpHash,
    targetOrigin: input.targetOrigin || '',
    returnPath: input.returnPath || '/',
    rememberMe: input.rememberMe,
    attempts: 0,
    maximumAttempts: config.maximumAttempts,
    deliveryStatus: 'pending',
    createDate: now,
    resendAvailableAt,
    expiresAt,
    verifiedAt: null,
    consumedAt: null,
    supersededAt: null,
  });
  return {
    accepted: true,
    challengeId,
    retryAfterSeconds: config.resendDelaySeconds,
    expiresInSeconds: config.codeTtlSeconds,
    deliveryRequired: true,
    code,
    linkToken,
  };
}

export async function setEmailChallengeDelivery(
  challengeId: string,
  delivered: boolean
): Promise<void> {
  await db.EmailAuthChallenge.updateOne(
    { challengeId, consumedAt: null },
    { $set: { deliveryStatus: delivered ? 'sent' : 'failed' } }
  );
}

async function activeChallenge(challengeId: string): Promise<StoredChallenge | null> {
  return db.EmailAuthChallenge.findOne({
    challengeId,
    consumedAt: null,
    supersededAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
}

async function recordInvalidAttempt(challenge: StoredChallenge): Promise<void> {
  const nextAttempts = Number(challenge.attempts || 0) + 1;
  await db.EmailAuthChallenge.updateOne(
    { _id: challenge._id, consumedAt: null },
    {
      $inc: { attempts: 1 },
      ...(nextAttempts >= Number(challenge.maximumAttempts || 1)
        ? { $set: { supersededAt: new Date() } }
        : {}),
    }
  );
}

function credentialMatches(
  req: WikitruthRequest,
  challenge: StoredChallenge,
  code: string,
  linkToken: string
): boolean {
  if (code && /^\d{6}$/.test(code)) {
    return secureEqual(challenge.codeHash, digest(req, `email-code:${challenge.challengeId}`, code));
  }
  if (linkToken && /^[A-Za-z0-9_-]{40,}$/.test(linkToken)) {
    return secureEqual(
      challenge.linkTokenHash,
      digest(req, `email-link:${challenge.challengeId}`, linkToken)
    );
  }
  return false;
}

async function consumeForExistingUser(challenge: StoredChallenge): Promise<boolean> {
  const consumed = await db.EmailAuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: null,
      supersededAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { verifiedAt: new Date(), consumedAt: new Date() } },
    { returnDocument: 'before' }
  ).lean();
  return Boolean(consumed);
}

export async function verifyEmailAuthChallenge(
  req: WikitruthRequest,
  input: { challengeId: string; code?: string; linkToken?: string }
) {
  const challenge = await activeChallenge(input.challengeId);
  if (!challenge || Number(challenge.attempts || 0) >= Number(challenge.maximumAttempts || 1)) {
    throw genericInvalid();
  }
  if (!credentialMatches(req, challenge, String(input.code || ''), String(input.linkToken || ''))) {
    await recordInvalidAttempt(challenge);
    throw genericInvalid();
  }

  const user = challenge.userId
    ? await db.User.findById(challenge.userId)
    : await db.User.findOne({ email: challenge.email });
  if (user) {
    if (user.isActive && user.isActive !== 'yes') {
      await consumeForExistingUser(challenge);
      throw genericInvalid();
    }
    if (!(await consumeForExistingUser(challenge))) throw genericInvalid();
    return { kind: 'existing' as const, user, context: challengeContext(challenge) };
  }

  const completionToken = randomBytes(32).toString('base64url');
  const updated = await db.EmailAuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: null,
      supersededAt: null,
      verifiedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        verifiedAt: new Date(),
        completionTokenHash: digest(
          req,
          `email-completion:${challenge.challengeId}`,
          completionToken
        ),
      },
    },
    { returnDocument: 'after' }
  ).lean();
  if (!updated) throw genericInvalid();
  return {
    kind: 'new' as const,
    completionToken,
    context: challengeContext(challenge),
  };
}

export async function completeEmailAuthSignup(
  req: WikitruthRequest,
  input: { challengeId: string; completionToken: string; username: string }
) {
  const challenge = await activeChallenge(input.challengeId);
  if (
    !challenge?.verifiedAt ||
    !challenge.completionTokenHash ||
    !secureEqual(
      challenge.completionTokenHash,
      digest(req, `email-completion:${input.challengeId}`, input.completionToken)
    )
  ) {
    throw genericInvalid();
  }
  if (!/^[a-zA-Z0-9\-_]+$/.test(input.username)) {
    throw new EmailAuthError('Use letters, numbers, dash, or underscore for the username', 400, 'USERNAME_INVALID');
  }

  const existingEmailUser = await db.User.findOne({ email: challenge.email });
  if (existingEmailUser) {
    if (existingEmailUser.isActive && existingEmailUser.isActive !== 'yes') throw genericInvalid();
    if (!(await consumeForExistingUser(challenge))) throw genericInvalid();
    return { user: existingEmailUser, context: challengeContext(challenge) };
  }
  if (await db.User.findOne({ username: input.username })) {
    throw new EmailAuthError('Username is already taken', 409, 'USERNAME_TAKEN');
  }

  const consumedAt = new Date();
  const reserved = await db.EmailAuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: null,
      supersededAt: null,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: consumedAt },
    },
    { $set: { consumedAt } },
    { returnDocument: 'before' }
  ).lean();
  if (!reserved) throw genericInvalid();

  let user: Record<string, any> | null = null;
  let account: Record<string, any> | null = null;
  try {
    const createdUser = await db.User.create({
      isActive: 'yes',
      username: input.username,
      email: challenge.email,
      passwordLoginDisabled: true,
      search: [input.username, challenge.email],
      onboarding: {
        contributor: { completed: false },
        reviewer: { completed: false },
      },
    });
    user = createdUser;
    const createdAccount = await db.Account.create({
      isVerified: 'yes',
      'name.full': input.username,
      user: { id: createdUser._id, name: input.username },
      search: [input.username],
    });
    account = createdAccount;
    createdUser.roles ||= {};
    createdUser.roles.account = createdAccount._id;
    await createdUser.save();
    return { user: createdUser, context: challengeContext(challenge) };
  } catch (error) {
    if (account?._id) await db.Account.findByIdAndDelete(account._id).catch(() => undefined);
    if (user?._id) await db.User.findByIdAndDelete(user._id).catch(() => undefined);
    await db.EmailAuthChallenge.updateOne(
      { _id: challenge._id, consumedAt },
      { $set: { consumedAt: null } }
    );
    throw error;
  }
}

export async function verifyUserEmailOwnership(user: Record<string, any>): Promise<void> {
  const accountId = user?.roles?.account?._id || user?.roles?.account;
  if (!accountId) return;
  await db.Account.findByIdAndUpdate(
    accountId,
    { $set: { isVerified: 'yes', verificationToken: '' } },
    { returnDocument: 'after' }
  );
}
