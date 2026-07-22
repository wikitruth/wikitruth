'use strict';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import * as httpClient from '../../utils/httpClient';

import appModForDb from '../../app';
type AuthUserLike = {
  _id: string;
  username: string;
  email?: string;
  roles?: unknown;
  onboarding?: unknown;
  passwordLoginDisabled?: boolean;
};

type AuthUserDocument = {
  _id: string;
  id: string;
  username: string;
  email?: string;
  roles?: Record<string, unknown>;
  onboarding?: Record<string, unknown>;
  canPlayRoleOf?: (role: string) => boolean;
  defaultReturnUrl?: () => string;
  isAdmin?: () => boolean;
  password?: string;
  passwordLoginDisabled?: boolean;
  search?: string[];
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  mobileTokens?: MobileRefreshTokenRecord[];
  twitter?: { id?: string };
  github?: { id?: string };
  facebook?: { id?: string };
  google?: { id?: string };
  apple?: { id?: string };
  microsoft?: { id?: string };
  save: () => Promise<AuthUserDocument>;
};

type MobileRefreshTokenRecord = {
  tokenId?: string;
  tokenHash?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date | null;
  client?: {
    platform?: string;
    version?: string;
    build?: string;
  };
};

type AccountDocument = {
  _id: unknown;
  isVerified?: string;
  verificationToken?: string;
  name?: {
    first?: string;
    middle?: string;
    last?: string;
    full?: string;
  };
  company?: string;
  phone?: string;
  zip?: string;
  user?: {
    id?: unknown;
    name?: string;
  };
  save: () => Promise<AccountDocument>;
};

type ModelsContract = {
  User: {
    findById: (id: unknown) => Promise<AuthUserDocument | null>;
    findOne: (query: Record<string, unknown>) => Promise<AuthUserDocument | null>;
    create: (fields: Record<string, unknown>) => Promise<AuthUserDocument>;
    encryptPassword: (password: string, done: (err: unknown, hash?: string) => void) => void;
    validatePassword: (password: string, hash: string) => Promise<boolean>;
  };
  Account: {
    create: (fields: Record<string, unknown>) => Promise<AccountDocument>;
    findById: (id: unknown) => Promise<AccountDocument | null>;
    findByIdAndUpdate: (
      id: unknown,
      fields: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Promise<AccountDocument | null>;
  };
  Admin?: {
    findByIdAndUpdate: (id: unknown, fields: Record<string, unknown>) => Promise<unknown>;
  };
  LoginAttempt?: {
    countDocuments: (query: Record<string, unknown>) => Promise<number>;
    create: (fields: Record<string, unknown>) => Promise<unknown>;
  };
};

const db = (appModForDb as unknown as { db: { models: ModelsContract } }).db.models;

type FastSwitchCookie = {
  id?: string;
  data?: string;
  created?: string | Date;
};

type SendmailPayload = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  textPath: string;
  htmlPath: string;
  locals: Record<string, string>;
  success: () => void;
  error: (err: unknown) => void;
};

type MobileApiConfig = {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  maxRefreshSessionsPerUser: number;
};

type AuthAppContext = {
  config?: {
    loginAttempts?: {
      forIp?: number;
      forIpAndUser?: number;
    };
    smtp?: {
      from?: {
        name?: string;
        address?: string;
      };
    };
    projectName?: string;
    oauth?: Record<string, { key?: string }>;
    grecaptcha?: {
      secret?: string;
    };
    requireAccountVerification?: boolean;
    jwtSecret?: string;
    mobileApi?: Partial<MobileApiConfig>;
  };
  utility?: {
    sendmail?: (
      req: WikitruthRequest,
      res: WikitruthResponse,
      options: SendmailPayload
    ) => void;
  };
};

type ActiveRole = 'reader' | 'contributor' | 'screener' | 'reviewer' | 'admin';

function sanitizeUser(user: AuthUserLike | null | undefined) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    onboarding: user.onboarding,
    passwordLoginDisabled: Boolean(user.passwordLoginDisabled),
  };
}

function isOnboardingComplete(
  user: AuthUserDocument | AuthUserLike | null | undefined,
  track: 'contributor' | 'reviewer',
): boolean {
  const roleSet = user?.roles as Record<string, unknown> | undefined;
  if (roleSet?.admin) {
    return true;
  }
  const onboarding = user?.onboarding as Record<string, { completed?: unknown }> | undefined;
  const value = onboarding?.[track]?.completed;
  // Existing accounts are grandfathered; new assignments explicitly persist false.
  return typeof value === 'undefined' ? true : value === true;
}

function getAvailableRoles(user: AuthUserDocument | AuthUserLike | null | undefined): ActiveRole[] {
  const roles: ActiveRole[] = ['reader'];
  const roleSet = user?.roles as Record<string, unknown> | undefined;
  if (isOnboardingComplete(user, 'contributor')) {
    roles.push('contributor');
  }
  if (roleSet?.screener) {
    roles.push('screener');
  }
  if (roleSet?.reviewer && isOnboardingComplete(user, 'reviewer')) {
    roles.push('reviewer');
  }
  if (roleSet?.admin) {
    roles.push('admin');
  }
  return roles;
}

function getDefaultActiveRole(user: AuthUserDocument | AuthUserLike | null | undefined): ActiveRole {
  const available = getAvailableRoles(user);
  return available.includes('contributor') ? 'contributor' : 'reader';
}

function normalizeActiveRole(
  role: unknown,
  user: AuthUserDocument | AuthUserLike | null | undefined,
): ActiveRole | null {
  const normalizedRole = String(role || '').trim().toLowerCase();
  if (!normalizedRole) {
    return null;
  }
  if (!['reader', 'contributor', 'screener', 'reviewer', 'admin'].includes(normalizedRole)) {
    return null;
  }
  const allowedRoles = getAvailableRoles(user);
  return allowedRoles.includes(normalizedRole as ActiveRole) ? (normalizedRole as ActiveRole) : null;
}

function getSessionActiveRole(req: WikitruthRequest): ActiveRole | null {
  const stored = req.session?.preferences?.activeRole;
  return normalizeActiveRole(stored, req.user as unknown as AuthUserDocument | null);
}

function setSessionActiveRole(req: WikitruthRequest, role: ActiveRole): void {
  if (!req.session.preferences || typeof req.session.preferences !== 'object') {
    req.session.preferences = {};
  }
  req.session.preferences.activeRole = role;
}

async function validateRecaptcha(req: WikitruthRequest, token: string): Promise<boolean> {
  const appCtx = req.app as unknown as AuthAppContext;
  const secret = String(appCtx.config?.grecaptcha?.secret || '').trim();
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }

  try {
    const captchaResult = await httpClient.postForm<{ success?: boolean }>('https://www.google.com/recaptcha/api/siteverify', {
      secret: secret,
      response: token,
    });
    return Boolean(captchaResult.statusCode === 200 && captchaResult.body?.success);
  } catch (_error) {
    return false;
  }
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(username);
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9\-_.+]+@[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+$/.test(email);
}

function encryptPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    db.User.encryptPassword(password, function (err, hash) {
      if (err) {
        reject(err);
        return;
      }

      if (!hash) {
        reject(new Error('Password hashing failed'));
        return;
      }

      resolve(hash);
    });
  });
}

function getAccountIdFromUser(user: { roles?: unknown } | null | undefined): unknown {
  if (!user?.roles) {
    return null;
  }

  const accountRole = (user.roles as Record<string, unknown>).account;
  if (!accountRole) {
    return null;
  }

  if (typeof accountRole === 'string') {
    return accountRole;
  }

  if (typeof accountRole === 'object') {
    const accountRecord = accountRole as { id?: unknown; _id?: unknown };
    return accountRecord.id || accountRecord._id || null;
  }

  return null;
}

function parseFastSwitchCookies(rawValue: unknown): FastSwitchCookie[] {
  if (Array.isArray(rawValue)) {
    return rawValue as FastSwitchCookie[];
  }

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as FastSwitchCookie[];
      }
    } catch (_err) {
      return [];
    }
  }

  return [];
}

function getOauthProviders(req: WikitruthRequest): Record<string, boolean> {
  const oauthConfig = (req.app as unknown as AuthAppContext).config?.oauth || {};
  return {
    twitter: Boolean(oauthConfig.twitter?.key),
    github: Boolean(oauthConfig.github?.key),
    facebook: Boolean(oauthConfig.facebook?.key),
    google: Boolean(oauthConfig.google?.key),
    apple: Boolean(oauthConfig.apple?.key),
    microsoft: Boolean(oauthConfig.microsoft?.key),
  };
}

function getSocialConnections(user: AuthUserDocument | null): Record<string, boolean> {
  return {
    twitter: Boolean(user?.twitter?.id),
    github: Boolean(user?.github?.id),
    facebook: Boolean(user?.facebook?.id),
    google: Boolean(user?.google?.id),
    apple: Boolean(user?.apple?.id),
    microsoft: Boolean(user?.microsoft?.id),
  };
}

function getLoginAttemptLimits(req: WikitruthRequest): { forIp: number; forIpAndUser: number } {
  const appCtx = req.app as unknown as AuthAppContext;
  return {
    forIp: Number(appCtx.config?.loginAttempts?.forIp || 50),
    forIpAndUser: Number(appCtx.config?.loginAttempts?.forIpAndUser || 7),
  };
}

async function isLoginAttemptBlocked(req: WikitruthRequest, userKey: string): Promise<boolean> {
  if (!db.LoginAttempt?.countDocuments) {
    return false;
  }

  try {
    const limits = getLoginAttemptLimits(req);
    const [ipAttempts, ipUserAttempts] = await Promise.all([
      db.LoginAttempt.countDocuments({ ip: req.ip }),
      db.LoginAttempt.countDocuments({ ip: req.ip, user: userKey }),
    ]);
    return ipAttempts >= limits.forIp || ipUserAttempts >= limits.forIpAndUser;
  } catch (_error) {
    return false;
  }
}

async function recordFailedLoginAttempt(req: WikitruthRequest, userKey: string): Promise<void> {
  if (!db.LoginAttempt?.create) {
    return;
  }
  try {
    await db.LoginAttempt.create({ ip: req.ip, user: userKey });
  } catch (_error) {
    // Login should still respond even if attempt tracking write fails.
  }
}

function getRequestOrigin(req: WikitruthRequest): string {
  const forwardedProto = (String(req.get('x-forwarded-proto') || '').split(',')[0] || '').trim();
  const forwardedHost = (String(req.get('x-forwarded-host') || '').split(',')[0] || '').trim();
  const directHost = (String(req.get('host') || '').split(',')[0] || '').trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || directHost;
  if (!host) {
    return '';
  }
  return `${protocol}://${host}`;
}

function buildAbsoluteUrl(req: WikitruthRequest, path: string): string {
  const origin = getRequestOrigin(req);
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  if (!origin) {
    return normalizedPath;
  }
  return `${origin}${normalizedPath}`;
}

async function deliverEmail(req: WikitruthRequest, res: WikitruthResponse, payload: {
  to: string;
  subject: string;
  textPath: string;
  htmlPath: string;
  locals: Record<string, string>;
}): Promise<boolean> {
  const appCtx = req.app as unknown as AuthAppContext;
  const sendmail = appCtx.utility?.sendmail;
  if (!sendmail) {
    return false;
  }

  const fromName = String(appCtx.config?.smtp?.from?.name || appCtx.config?.projectName || 'Wikitruth').trim();
  const fromAddress = String(appCtx.config?.smtp?.from?.address || '').trim();
  if (!fromAddress) {
    return false;
  }

  return new Promise((resolve) => {
    sendmail(req, res, {
      from: `${fromName} <${fromAddress}>`,
      to: payload.to,
      subject: payload.subject,
      textPath: payload.textPath,
      htmlPath: payload.htmlPath,
      locals: payload.locals,
      success: () => resolve(true),
      error: () => resolve(false),
    });
  });
}

export {
  db,
  sanitizeUser,
  normalizeActiveRole,
  getAvailableRoles,
  getDefaultActiveRole,
  isOnboardingComplete,
  getSessionActiveRole,
  setSessionActiveRole,
  validateRecaptcha,
  isValidUsername,
  isValidEmail,
  encryptPassword,
  parseFastSwitchCookies,
  getOauthProviders,
  getSocialConnections,
  isLoginAttemptBlocked,
  recordFailedLoginAttempt,
  getAccountIdFromUser,
  buildAbsoluteUrl,
  deliverEmail,
};

export type {
  AuthAppContext,
  AuthUserDocument,
  AuthUserLike,
};
