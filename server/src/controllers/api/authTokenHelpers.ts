'use strict';

import type { WikitruthRequest } from '../../types/http';
import cryptoMod from 'crypto';
import jwtMod from 'jsonwebtoken';

import {
  db,
  type AuthAppContext,
  type AuthUserDocument,
  type AuthUserLike,
} from './authHelpers';

const crypto = cryptoMod as unknown as typeof import('crypto');
const jwt = jwtMod as unknown as typeof import('jsonwebtoken');

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

function createResetToken(): string {
  return crypto.randomBytes(21).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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

export {
  createResetToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
};
