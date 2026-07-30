'use strict';

import { createHmac } from 'crypto';
import type { NextFunction } from 'express';
import type { AuthenticationMethod } from './authAssuranceService';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';

interface AuthenticatedSessionConfig {
  standardMaxAgeMs: number;
  rememberedMaxAgeMs: number;
  activityUpdateIntervalMs: number;
}

interface SessionRecord {
  _id?: unknown;
  sessionKeyHash: string;
  userId: unknown;
  authenticationMethod: AuthenticationMethod;
  remembered: boolean;
  userAgent?: string;
  ipAddress?: string;
  createDate: Date;
  lastActivityAt: Date;
  absoluteExpiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string;
}

type WebSessionModel = {
  create: (values: Record<string, unknown>) => Promise<SessionRecord>;
  findOne: (query: Record<string, unknown>) => { lean: () => Promise<SessionRecord | null> };
  find: (query: Record<string, unknown>) => {
    sort: (sort: Record<string, number>) => { lean: () => Promise<SessionRecord[]> };
  };
  findOneAndUpdate: (
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => { lean: () => Promise<SessionRecord | null> };
  updateOne: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<{ modifiedCount?: number }>;
};

type SessionApp = {
  config?: {
    cryptoKey?: string;
    session?: {
      name?: string;
      cookie?: { secure?: boolean; sameSite?: 'lax' | 'strict' | 'none' };
      authenticated?: Partial<AuthenticatedSessionConfig>;
    };
  };
  db?: { models?: { WebSession?: WebSessionModel } };
};

const DEFAULTS: AuthenticatedSessionConfig = {
  standardMaxAgeMs: 24 * 60 * 60 * 1000,
  rememberedMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
  activityUpdateIntervalMs: 5 * 60 * 1000,
};

function appOf(req: WikitruthRequest): SessionApp {
  return req.app as unknown as SessionApp;
}

function modelOf(req: WikitruthRequest): WebSessionModel | null {
  return appOf(req).db?.models?.WebSession || null;
}

export function getAuthenticatedSessionConfig(req: WikitruthRequest): AuthenticatedSessionConfig {
  const configured = appOf(req).config?.session?.authenticated || {};
  return {
    standardMaxAgeMs: positiveNumber(configured.standardMaxAgeMs, DEFAULTS.standardMaxAgeMs),
    rememberedMaxAgeMs: positiveNumber(configured.rememberedMaxAgeMs, DEFAULTS.rememberedMaxAgeMs),
    activityUpdateIntervalMs: positiveNumber(
      configured.activityUpdateIntervalMs,
      DEFAULTS.activityUpdateIntervalMs
    ),
  };
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function userIdOf(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

function sessionHash(req: WikitruthRequest): string {
  const secret = String(appOf(req).config?.cryptoKey || '');
  if (!secret || !req.sessionID) throw new Error('Session security configuration is unavailable');
  return createHmac('sha256', secret).update(req.sessionID, 'utf8').digest('hex');
}

function limited(value: unknown, maximum: number): string {
  return String(value || '').trim().slice(0, maximum);
}

function idText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toString' in value) return String(value);
  return '';
}

export async function registerAuthenticatedWebSession(
  req: WikitruthRequest,
  method: AuthenticationMethod,
  rememberMe: boolean
): Promise<void> {
  const userId = userIdOf(req);
  if (!userId) throw new Error('Authenticated user is required to register a session');
  const model = modelOf(req);
  const config = getAuthenticatedSessionConfig(req);
  const now = new Date();
  const maximumAge = rememberMe ? config.rememberedMaxAgeMs : config.standardMaxAgeMs;
  const absoluteExpiresAt = new Date(now.getTime() + maximumAge);
  const sessionKeyHash = sessionHash(req);

  if (model && req.session.webSession?.registryId) {
    await model.updateOne(
      { _id: req.session.webSession.registryId, revokedAt: null },
      { $set: { revokedAt: now, revokedReason: 'reauthenticated' } }
    );
  }

  const values = {
    sessionKeyHash,
    userId,
    authenticationMethod: method,
    remembered: rememberMe,
    userAgent: limited(req.get('user-agent'), 500),
    ipAddress: limited(req.ip, 120),
    createDate: now,
    lastActivityAt: now,
    absoluteExpiresAt,
    revokedAt: null,
    revokedReason: '',
  };
  const record = model ? await model.create(values) : ({ ...values, _id: sessionKeyHash } as SessionRecord);

  req.session.webSession = {
    registryId: idText(record._id) || sessionKeyHash,
    sessionKeyHash,
    remembered: rememberMe,
    absoluteExpiresAt: absoluteExpiresAt.toISOString(),
  };
  req.session.cookie.expires = absoluteExpiresAt;
  delete req.session.pendingRememberMe;
}

export async function revokeCurrentWebSession(
  req: WikitruthRequest,
  reason = 'signed_out'
): Promise<void> {
  const model = modelOf(req);
  const registryId = req.session.webSession?.registryId;
  if (!model || !registryId) return;
  await model.updateOne(
    { _id: registryId, userId: userIdOf(req), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: limited(reason, 120) } }
  );
}

export async function revokeOtherWebSessions(
  req: WikitruthRequest,
  userId: string,
  reason: string
): Promise<number> {
  const model = modelOf(req);
  if (!model || !userId) return 0;
  const currentId = req.session.webSession?.registryId;
  const result = await model.updateMany(
    {
      userId,
      revokedAt: null,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    },
    { $set: { revokedAt: new Date(), revokedReason: limited(reason, 120) } }
  );
  return Number(result.modifiedCount || 0);
}

export async function revokeAllWebSessions(
  req: WikitruthRequest,
  userId: string,
  reason: string
): Promise<number> {
  const model = modelOf(req);
  if (!model || !userId) return 0;
  const result = await model.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: limited(reason, 120) } }
  );
  return Number(result.modifiedCount || 0);
}

export async function listWebSessions(req: WikitruthRequest) {
  const model = modelOf(req);
  if (!model) return [];
  const records = await model
    .find({ userId: userIdOf(req), revokedAt: null, absoluteExpiresAt: { $gt: new Date() } })
    .sort({ lastActivityAt: -1 })
    .lean();
  const currentId = req.session.webSession?.registryId;
  return records.map(record => ({
    id: idText(record._id),
    current: idText(record._id) === currentId,
    remembered: Boolean(record.remembered),
    authenticationMethod: record.authenticationMethod,
    device: describeUserAgent(record.userAgent),
    userAgent: record.userAgent || '',
    ipAddress: record.ipAddress || '',
    createdAt: new Date(record.createDate).toISOString(),
    lastActivityAt: new Date(record.lastActivityAt).toISOString(),
    expiresAt: new Date(record.absoluteExpiresAt).toISOString(),
  }));
}

export async function revokeWebSessionById(
  req: WikitruthRequest,
  registryId: string
): Promise<boolean> {
  if (!registryId || registryId === req.session.webSession?.registryId) return false;
  const model = modelOf(req);
  if (!model) return false;
  const record = await model.findOneAndUpdate(
    { _id: registryId, userId: userIdOf(req), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'revoked_by_user' } },
    { returnDocument: 'after' }
  ).lean();
  return Boolean(record);
}

function describeUserAgent(userAgent: unknown): string {
  const value = String(userAgent || '');
  const browser = /Edg\//.test(value)
    ? 'Edge'
    : /Firefox\//.test(value)
      ? 'Firefox'
      : /CriOS\//.test(value)
        ? 'Chrome'
        : /Chrome\//.test(value)
          ? 'Chrome'
          : /Safari\//.test(value)
            ? 'Safari'
            : 'Browser';
  const platform = /iPhone/.test(value)
    ? 'iPhone'
    : /iPad/.test(value)
      ? 'iPad'
      : /Android/.test(value)
        ? 'Android'
        : /Macintosh/.test(value)
          ? 'Mac'
          : /Windows/.test(value)
            ? 'Windows'
            : /Linux/.test(value)
              ? 'Linux'
              : 'device';
  return `${browser} on ${platform}`;
}

function queryRememberPreference(req: WikitruthRequest): boolean | null {
  if (!/^\/(?:login|signup)\/(?:twitter|github|facebook|google|apple|microsoft)\/?$/i.test(req.path)) {
    return null;
  }
  const raw = String(req.query?.rememberMe || '').trim().toLowerCase();
  if (!raw) return null;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

async function clearInvalidSession(req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
  if (req.user && typeof req.logout === 'function') {
    await new Promise<void>(resolve => req.logout(() => resolve()));
  }
  await new Promise<void>(resolve => req.session.destroy(() => resolve()));
  const sessionConfig = appOf(req).config?.session;
  res.clearCookie(sessionConfig?.name || 'sid', {
    secure: Boolean(sessionConfig?.cookie?.secure),
    sameSite: sessionConfig?.cookie?.sameSite || 'lax',
  });
}

export async function enforceAuthenticatedWebSession(
  req: WikitruthRequest,
  res: WikitruthResponse,
  next: NextFunction
): Promise<void> {
  try {
    const pendingPreference = queryRememberPreference(req);
    if (pendingPreference !== null && !req.user) req.session.pendingRememberMe = pendingPreference;
    if (!req.user) {
      next();
      return;
    }

    const model = modelOf(req);
    const metadata = req.session.webSession;
    if (!metadata) {
      const remaining = Number(req.session.cookie.maxAge || 0);
      const remembered = req.session.pendingRememberMe ?? remaining > getAuthenticatedSessionConfig(req).standardMaxAgeMs;
      const method = req.session.authentication?.method || 'oauth';
      await registerAuthenticatedWebSession(req, method, remembered);
      next();
      return;
    }

    const expiresAt = new Date(metadata.absoluteExpiresAt);
    const userId = userIdOf(req);
    const record = model
      ? await model.findOne({
          _id: metadata.registryId,
          sessionKeyHash: metadata.sessionKeyHash,
          userId,
        }).lean()
      : null;
    if (
      !record ||
      record.revokedAt ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now() ||
      new Date(record.absoluteExpiresAt).getTime() <= Date.now()
    ) {
      await clearInvalidSession(req, res);
      next();
      return;
    }

    req.session.cookie.expires = expiresAt;
    const interval = getAuthenticatedSessionConfig(req).activityUpdateIntervalMs;
    if (Date.now() - new Date(record.lastActivityAt).getTime() >= interval) {
      await model!.updateOne(
        { _id: metadata.registryId, revokedAt: null },
        { $set: { lastActivityAt: new Date() } }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}
