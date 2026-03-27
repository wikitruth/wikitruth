'use strict';

import type { Router } from 'express';
import type { WikitruthNext, WikitruthRequest, WikitruthResponse } from '../../types/http';

const crypto = require('crypto') as typeof import('crypto');
const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');

type AuthUserLike = {
  _id: string;
  username: string;
  email?: string;
  roles?: unknown;
};

type AuthUserDocument = {
  _id: string;
  id: string;
  username: string;
  email?: string;
  roles?: Record<string, unknown>;
  canPlayRoleOf?: (role: string) => boolean;
  defaultReturnUrl?: () => string;
  isAdmin?: () => boolean;
  password?: string;
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

const db = require('../../app').db.models as ModelsContract;

type TokenKind = 'access' | 'refresh';

type MobileApiConfig = {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  maxRefreshSessionsPerUser: number;
};

type MobileClientTelemetry = {
  platform: string;
  version: string;
  build: string;
};

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

function sanitizeUser(user: AuthUserLike | null | undefined) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };
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

function createResetToken(): string {
  return crypto.randomBytes(21).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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

function getMobileApiConfig(req: WikitruthRequest): MobileApiConfig {
  const appConfig = (req.app as unknown as AuthAppContext).config?.mobileApi || {};
  return {
    accessTokenTtlSeconds: Number(appConfig.accessTokenTtlSeconds || 900),
    refreshTokenTtlSeconds: Number(appConfig.refreshTokenTtlSeconds || 2592000),
    maxRefreshSessionsPerUser: Number(appConfig.maxRefreshSessionsPerUser || 10),
  };
}

function getJwtSecret(req: WikitruthRequest): string {
  const secret = String((req.app as unknown as AuthAppContext).config?.jwtSecret || '').trim();
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  return secret;
}

function resolveUserId(user: AuthUserDocument | AuthUserLike): string {
  return String((user as { _id?: unknown })._id || (user as { id?: unknown }).id || '').trim();
}

function getClientTelemetry(req: WikitruthRequest): MobileClientTelemetry {
  return {
    platform: String(req.header('x-client-platform') || '').trim(),
    version: String(req.header('x-client-version') || '').trim(),
    build: String(req.header('x-client-build') || '').trim(),
  };
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

function signToken(req: WikitruthRequest, user: AuthUserDocument, kind: TokenKind, tokenId: string, expiresInSeconds: number): string {
  const jwtSecret = getJwtSecret(req);
  const now = Math.floor(Date.now() / 1000);
  const subject = resolveUserId(user);

  return jwt.sign(
    {
      type: kind,
      jti: tokenId,
      scope: 'mobile',
      iat: now,
      sub: subject,
    },
    jwtSecret,
    {
      expiresIn: expiresInSeconds,
      issuer: 'wikitruth',
      audience: 'wikitruth-mobile',
    }
  );
}

function parseVerifiedToken(req: WikitruthRequest, token: string, expectedType: TokenKind): { sub?: string; jti?: string } | null {
  const jwtSecret = getJwtSecret(req);
  const payload = jwt.verify(token, jwtSecret, {
    issuer: 'wikitruth',
    audience: 'wikitruth-mobile',
  }) as { type?: TokenKind; sub?: string; jti?: string };

  if (!payload || payload.type !== expectedType || !payload.sub || !payload.jti) {
    return null;
  }

  return payload;
}

function issueTokenPair(req: WikitruthRequest, user: AuthUserDocument): {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
} {
  const mobileApiConfig = getMobileApiConfig(req);
  const accessTokenId = createResetToken();
  const refreshTokenId = createResetToken();

  const accessToken = signToken(req, user, 'access', accessTokenId, mobileApiConfig.accessTokenTtlSeconds);
  const refreshToken = signToken(req, user, 'refresh', refreshTokenId, mobileApiConfig.refreshTokenTtlSeconds);

  const mobileTokens = Array.isArray(user.mobileTokens) ? user.mobileTokens : [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + mobileApiConfig.refreshTokenTtlSeconds * 1000);
  const clientTelemetry = getClientTelemetry(req);

  const activeTokens = mobileTokens.filter(function (entry) {
    if (!entry?.tokenId || !entry?.tokenHash) {
      return false;
    }
    if (entry.revokedAt) {
      return false;
    }
    if (entry.expiresAt && entry.expiresAt.getTime() <= now.getTime()) {
      return false;
    }
    return true;
  });

  const boundedTokens = activeTokens.slice(-Math.max(0, mobileApiConfig.maxRefreshSessionsPerUser - 1));
  boundedTokens.push({
    tokenId: refreshTokenId,
    tokenHash: hashToken(refreshToken),
    issuedAt: now,
    expiresAt: expiresAt,
    revokedAt: null,
    client: clientTelemetry,
  });

  user.mobileTokens = boundedTokens;

  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    accessTokenExpiresIn: mobileApiConfig.accessTokenTtlSeconds,
    refreshTokenExpiresIn: mobileApiConfig.refreshTokenTtlSeconds,
  };
}

async function rotateRefreshToken(req: WikitruthRequest, refreshToken: string): Promise<{
  user: AuthUserDocument;
  accessToken: string;
  nextRefreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
} | null> {
  const payload = parseVerifiedToken(req, refreshToken, 'refresh');
  if (!payload?.sub || !payload.jti) {
    return null;
  }

  const user = await db.User.findById(payload.sub);
  if (!user) {
    return null;
  }

  const now = new Date();
  const records = Array.isArray(user.mobileTokens) ? user.mobileTokens : [];
  const tokenHash = hashToken(refreshToken);
  const matchingRecord = records.find(function (record) {
    return (
      String(record?.tokenId || '') === payload.jti &&
      String(record?.tokenHash || '') === tokenHash &&
      !record?.revokedAt &&
      (!record?.expiresAt || record.expiresAt.getTime() > now.getTime())
    );
  });

  if (!matchingRecord) {
    return null;
  }

  matchingRecord.revokedAt = now;

  const issued = issueTokenPair(req, user);
  await user.save();

  return {
    user: user,
    accessToken: issued.accessToken,
    nextRefreshToken: issued.refreshToken,
    accessTokenExpiresIn: issued.accessTokenExpiresIn,
    refreshTokenExpiresIn: issued.refreshTokenExpiresIn,
  };
}

async function revokeRefreshToken(req: WikitruthRequest, refreshToken: string): Promise<boolean> {
  const payload = parseVerifiedToken(req, refreshToken, 'refresh');
  if (!payload?.sub || !payload.jti) {
    return false;
  }

  const user = await db.User.findById(payload.sub);
  if (!user) {
    return false;
  }

  const records = Array.isArray(user.mobileTokens) ? user.mobileTokens : [];
  const tokenHash = hashToken(refreshToken);
  const record = records.find(function (entry) {
    return String(entry?.tokenId || '') === payload.jti && String(entry?.tokenHash || '') === tokenHash && !entry?.revokedAt;
  });

  if (!record) {
    return false;
  }

  record.revokedAt = new Date();
  await user.save();
  return true;
}

module.exports = function (router: Router) {
  router.get('/me', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, user: null });
      return;
    }

    res.json({ success: true, user: sanitizeUser(req.user) });
  });

  router.get('/providers', async function (req: WikitruthRequest, res: WikitruthResponse) {
    res.json({
      success: true,
      providers: getOauthProviders(req),
    });
  });

  router.post('/signup', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const username = String(req.body?.username || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!username || !email || !password) {
        res.status(400).json({ success: false, message: 'Username, email, and password are required' });
        return;
      }

      if (!isValidUsername(username)) {
        res.status(400).json({ success: false, message: 'Invalid username format' });
        return;
      }

      if (!isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email format' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const usernameTaken = await db.User.findOne({ username: username });
      if (usernameTaken) {
        res.status(409).json({ success: false, message: 'Username already taken' });
        return;
      }

      const emailTaken = await db.User.findOne({ email: email });
      if (emailTaken) {
        res.status(409).json({ success: false, message: 'Email already registered' });
        return;
      }

      const passwordHash = await encryptPassword(password);
      const user = await db.User.create({
        isActive: 'yes',
        username: username,
        email: email,
        password: passwordHash,
        search: [username, email],
      });

      const requireAccountVerification = Boolean(
        (req.app as unknown as AuthAppContext).config?.requireAccountVerification
      );

      const account = await db.Account.create({
        isVerified: requireAccountVerification ? 'no' : 'yes',
        'name.full': user.username,
        user: {
          id: user._id,
          name: user.username,
        },
        search: [user.username],
      });

      if (!user.roles) {
        user.roles = {};
      }
      user.roles.account = account._id;
      await user.save();

      req.login(user as never, function (err?: unknown) {
        if (err) {
          return next(err);
        }

        res.status(201).json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');
      const normalizedLoginIdentity = username.toLowerCase();

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
      }

      if (await isLoginAttemptBlocked(req, normalizedLoginIdentity)) {
        res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again later.',
        });
        return;
      }

      const user = await db.User.findOne({
        $or: [{ username: username }, { email: username.toLowerCase() }],
      });

      if (!user) {
        await recordFailedLoginAttempt(req, normalizedLoginIdentity);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const isValid = await db.User.validatePassword(password, user.password || '');
      if (!isValid) {
        await recordFailedLoginAttempt(req, normalizedLoginIdentity);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      req.login(user as never, function (err?: unknown) {
        if (err) {
          return next(err);
        }

        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/fast-switch', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const pin = String(req.body?.pin || '').trim();
      if (!/^\d{6}$/.test(pin)) {
        res.status(400).json({ success: false, message: 'PIN must be 6 digits' });
        return;
      }

      const fastSwitchCookies = parseFastSwitchCookies(req.cookies?.fast_switch);
      if (fastSwitchCookies.length === 0) {
        res.status(401).json({ success: false, message: 'No fast-switch session found' });
        return;
      }

      const secret = `${pin}|${String((req.app as unknown as AuthAppContext).config?.jwtSecret || '')}`;
      let matchedUserId = '';

      for (const cookie of fastSwitchCookies) {
        if (!cookie?.data) {
          continue;
        }

        try {
          const decoded = jwt.verify(cookie.data, secret) as { userId?: string };
          if (decoded?.userId) {
            matchedUserId = String(decoded.userId);
            break;
          }
        } catch (_err) {
          // Keep checking other trusted-client records.
        }
      }

      if (!matchedUserId) {
        res.status(401).json({ success: false, message: 'Invalid PIN' });
        return;
      }

      const user = await db.User.findById(matchedUserId);
      if (!user) {
        res.status(401).json({ success: false, message: 'Account not found' });
        return;
      }

      req.login(user as never, function (err?: unknown) {
        if (err) {
          return next(err);
        }

        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/account-settings', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const accountId = getAccountIdFromUser(user);
      const account = accountId ? await db.Account.findById(accountId) : null;

      res.json({
        success: true,
        account: {
          first: account?.name?.first || '',
          middle: account?.name?.middle || '',
          last: account?.name?.last || '',
          company: account?.company || '',
          phone: account?.phone || '',
          zip: account?.zip || '',
        },
        identity: {
          username: user.username || '',
          email: user.email || '',
        },
        providers: getOauthProviders(req),
        social: getSocialConnections(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/account-settings/contact', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const first = String(req.body?.first || '').trim();
      const middle = String(req.body?.middle || '').trim();
      const last = String(req.body?.last || '').trim();
      const company = String(req.body?.company || '').trim();
      const phone = String(req.body?.phone || '').trim();
      const zip = String(req.body?.zip || '').trim();

      if (!first) {
        res.status(400).json({ success: false, message: 'First name is required' });
        return;
      }
      if (!last) {
        res.status(400).json({ success: false, message: 'Last name is required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const updated = await db.Account.findByIdAndUpdate(
        accountId,
        {
          name: {
            first: first,
            middle: middle,
            last: last,
            full: `${first} ${last}`.trim(),
          },
          company: company,
          phone: phone,
          zip: zip,
          search: [first, middle, last, company, phone, zip],
        },
        { new: true },
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      res.json({
        success: true,
        account: {
          first: updated.name?.first || '',
          middle: updated.name?.middle || '',
          last: updated.name?.last || '',
          company: updated.company || '',
          phone: updated.phone || '',
          zip: updated.zip || '',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/account-settings/identity', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const username = String(req.body?.username || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();

      if (!username) {
        res.status(400).json({ success: false, message: 'Username is required' });
        return;
      }
      if (!isValidUsername(username)) {
        res.status(400).json({ success: false, message: 'Invalid username format' });
        return;
      }
      if (!email || !isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email format' });
        return;
      }

      const duplicateUsername = await db.User.findOne({ username: username, _id: { $ne: req.user._id || req.user.id } });
      if (duplicateUsername) {
        res.status(409).json({ success: false, message: 'Username already taken' });
        return;
      }

      const duplicateEmail = await db.User.findOne({ email: email, _id: { $ne: req.user._id || req.user.id } });
      if (duplicateEmail) {
        res.status(409).json({ success: false, message: 'Email already taken' });
        return;
      }

      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.username = username;
      user.email = email;
      user.search = [username, email];
      await user.save();

      if (user.roles?.admin && db.Admin?.findByIdAndUpdate) {
        await db.Admin.findByIdAndUpdate(user.roles.admin, {
          user: {
            id: user._id,
            name: user.username,
          },
        });
      }

      if (user.roles?.account) {
        await db.Account.findByIdAndUpdate(user.roles.account, {
          user: {
            id: user._id,
            name: user.username,
          },
        });
      }

      req.user.username = user.username;
      req.user.email = user.email;

      res.json({
        success: true,
        identity: {
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/account-settings/password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const newPassword = String(req.body?.newPassword || '');
      const confirm = String(req.body?.confirm || '');
      if (!newPassword) {
        res.status(400).json({ success: false, message: 'New password is required' });
        return;
      }
      if (!confirm) {
        res.status(400).json({ success: false, message: 'Password confirmation is required' });
        return;
      }
      if (newPassword !== confirm) {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.password = await encryptPassword(newPassword);
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/token', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      let user: AuthUserDocument | null = null;
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (username && password) {
        user = await db.User.findOne({
          $or: [{ username: username }, { email: username.toLowerCase() }],
        });

        if (!user) {
          res.status(401).json({ success: false, message: 'Invalid credentials' });
          return;
        }

        const validPassword = await db.User.validatePassword(password, user.password || '');
        if (!validPassword) {
          res.status(401).json({ success: false, message: 'Invalid credentials' });
          return;
        }
      } else if (req.user) {
        user = await db.User.findById(req.user._id || req.user.id);
      }

      if (!user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const issued = issueTokenPair(req, user);
      await user.save();

      res.status(201).json({
        success: true,
        tokenType: 'Bearer',
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        accessTokenExpiresIn: issued.accessTokenExpiresIn,
        refreshTokenExpiresIn: issued.refreshTokenExpiresIn,
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/token/refresh', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const refreshToken = String(req.body?.refreshToken || '').trim();
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'refreshToken is required' });
        return;
      }

      const rotated = await rotateRefreshToken(req, refreshToken);
      if (!rotated) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.json({
        success: true,
        tokenType: 'Bearer',
        accessToken: rotated.accessToken,
        refreshToken: rotated.nextRefreshToken,
        accessTokenExpiresIn: rotated.accessTokenExpiresIn,
        refreshTokenExpiresIn: rotated.refreshTokenExpiresIn,
        user: sanitizeUser(rotated.user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/token/revoke', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const refreshToken = String(req.body?.refreshToken || '').trim();
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'refreshToken is required' });
        return;
      }

      const revoked = await revokeRefreshToken(req, refreshToken);
      if (!revoked) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.json({ success: true, message: 'Refresh token revoked' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    req.logout(function (err?: unknown) {
      if (err) {
        return next(err);
      }

      req.session.destroy(function () {
        res.clearCookie('sid');
        res.json({ success: true });
      });
    });
  });

  router.post('/forgot-password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'A valid email is required' });
        return;
      }

      const user = await db.User.findOne({ email: email });
      if (!user) {
        res.status(202).json({ success: true, message: 'If an account exists, reset instructions were generated.' });
        return;
      }

      const token = createResetToken();
      user.resetPasswordToken = await encryptPassword(token);
      user.resetPasswordExpires = Date.now() + 10000000;
      await user.save();

      const appCtx = req.app as unknown as AuthAppContext;
      const projectName = String(appCtx.config?.projectName || 'Wikitruth').trim();
      const resetLink = buildAbsoluteUrl(
        req,
        `/app/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      );
      const emailSent = await deliverEmail(req, res, {
        to: user.email || email,
        subject: `Reset your ${projectName} password`,
        textPath: 'jade/login/forgot/email-text.jade',
        htmlPath: 'jade/login/forgot/email-html.jade',
        locals: {
          username: user.username || email,
          resetLink: resetLink,
          projectName: projectName,
        },
      });

      const responsePayload: Record<string, unknown> = {
        success: true,
        message: 'If an account exists, reset instructions were sent.',
      };

      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debug = {
          email: email,
          token: token,
          resetLink: resetLink,
          emailSent: emailSent,
        };
      }

      res.status(202).json(responsePayload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset-password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const token = String(req.body?.token || '').trim();
      const password = String(req.body?.password || '');

      if (!email || !token || !password) {
        res.status(400).json({ success: false, message: 'Email, token, and password are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const user = await db.User.findOne({
        email: email,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user || !user.resetPasswordToken) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        return;
      }

      const isValidToken = await db.User.validatePassword(token, user.resetPasswordToken);
      if (!isValidToken) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        return;
      }

      user.password = await encryptPassword(password);
      user.resetPasswordToken = '';
      user.resetPasswordExpires = 0;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  });

  router.get('/verification-status', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const account = await db.Account.findById(accountId);
      if (!account) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      const requireAccountVerification = Boolean(
        (req.app as unknown as AuthAppContext).config?.requireAccountVerification
      );

      res.json({
        success: true,
        verification: {
          required: requireAccountVerification,
          isVerified: account.isVerified === 'yes',
          email: req.user.email || '',
          hasPendingToken: Boolean(account.verificationToken),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verification-resend', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const account = await db.Account.findById(accountId);
      if (!account) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      const nextEmail = String(req.body?.email || req.user.email || '').trim().toLowerCase();
      if (!nextEmail || !isValidEmail(nextEmail)) {
        res.status(400).json({ success: false, message: 'A valid email is required' });
        return;
      }

      if (nextEmail !== String(req.user.email || '').toLowerCase()) {
        const duplicate = await db.User.findOne({
          email: nextEmail,
          _id: { $ne: req.user._id },
        });
        if (duplicate) {
          res.status(409).json({ success: false, message: 'Email is already in use' });
          return;
        }

        const user = await db.User.findById(req.user._id || req.user.id);
        if (!user) {
          res.status(404).json({ success: false, message: 'User not found' });
          return;
        }
        user.email = nextEmail;
        await user.save();
        req.user.email = nextEmail;
      }

      const token = createResetToken();
      account.verificationToken = await encryptPassword(token);
      account.isVerified = 'no';
      await account.save();

      const appCtx = req.app as unknown as AuthAppContext;
      const projectName = String(appCtx.config?.projectName || 'Wikitruth').trim();
      const verifyUrl = buildAbsoluteUrl(
        req,
        `/app/account/verification?token=${encodeURIComponent(token)}`
      );
      const emailSent = await deliverEmail(req, res, {
        to: req.user.email || nextEmail,
        subject: `Verify Your ${projectName} Account`,
        textPath: 'jade/account/verification/email-text.jade',
        htmlPath: 'jade/account/verification/email-html.jade',
        locals: {
          verifyURL: verifyUrl,
          projectName: projectName,
        },
      });

      const payload: Record<string, unknown> = {
        success: true,
        message: emailSent ? 'Verification email sent' : 'Verification token generated',
      };

      if (process.env.NODE_ENV !== 'production') {
        payload.debug = {
          email: req.user.email || '',
          token: token,
          verifyUrl: verifyUrl,
          emailSent: emailSent,
        };
      }

      if (!emailSent && process.env.NODE_ENV === 'production') {
        res.status(502).json({ success: false, message: 'Unable to send verification email right now' });
        return;
      }

      res.status(202).json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/verification-confirm', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const account = await db.Account.findById(accountId);
      if (!account) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      if (account.isVerified === 'yes') {
        res.json({ success: true, message: 'Account already verified' });
        return;
      }

      const token = String(req.body?.token || '').trim();
      if (!token) {
        res.status(400).json({ success: false, message: 'Verification token is required' });
        return;
      }

      if (!account.verificationToken) {
        res.status(400).json({ success: false, message: 'No verification token is pending' });
        return;
      }

      const valid = await db.User.validatePassword(token, account.verificationToken);
      if (!valid) {
        res.status(400).json({ success: false, message: 'Invalid verification token' });
        return;
      }

      account.isVerified = 'yes';
      account.verificationToken = '';
      await account.save();

      const reqUserRoles = (req.user.roles || {}) as Record<string, unknown>;
      const accountRole = reqUserRoles.account as { isVerified?: string; verificationToken?: string } | undefined;
      if (accountRole && typeof accountRole === 'object') {
        accountRole.isVerified = 'yes';
        accountRole.verificationToken = '';
      }

      res.json({ success: true, message: 'Account verified successfully' });
    } catch (error) {
      next(error);
    }
  });
};
