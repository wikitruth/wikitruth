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
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  mobileTokens?: MobileRefreshTokenRecord[];
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
  const appConfig = (req.app as { config?: { mobileApi?: Partial<MobileApiConfig> } }).config?.mobileApi || {};
  return {
    accessTokenTtlSeconds: Number(appConfig.accessTokenTtlSeconds || 900),
    refreshTokenTtlSeconds: Number(appConfig.refreshTokenTtlSeconds || 2592000),
    maxRefreshSessionsPerUser: Number(appConfig.maxRefreshSessionsPerUser || 10),
  };
}

function getJwtSecret(req: WikitruthRequest): string {
  const secret = String((req.app as { config?: { jwtSecret?: string } }).config?.jwtSecret || '').trim();
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
        (req.app as { config?: { requireAccountVerification?: boolean } }).config?.requireAccountVerification
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

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
      }

      const user = await db.User.findOne({
        $or: [{ username: username }, { email: username.toLowerCase() }],
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const isValid = await db.User.validatePassword(password, user.password || '');
      if (!isValid) {
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

      const responsePayload: Record<string, unknown> = {
        success: true,
        message: 'If an account exists, reset instructions were generated.',
      };

      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debug = {
          email: email,
          token: token,
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
        (req.app as { config?: { requireAccountVerification?: boolean } }).config?.requireAccountVerification
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

      const payload: Record<string, unknown> = {
        success: true,
        message: 'Verification token generated',
      };

      if (process.env.NODE_ENV !== 'production') {
        payload.debug = {
          email: req.user.email || '',
          token: token,
        };
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
