'use strict';

import type { NextFunction, Request, Response } from 'express';
import {
  AGENT_TOKEN_PREFIX,
  apiClientSecretsMatch,
  parseApiClientToken,
  toApiClientIdentity,
} from '../services/apiClientService';

type RateWindow = { startedAt: number; count: number };
const rateWindows = new Map<string, RateWindow>();

function bearerToken(req: Request): string | null {
  const authorization = String(req.headers.authorization || '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1] ? match[1].trim() : null;
}

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

export async function authenticateApiClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawToken = bearerToken(req);
  if (!rawToken || !rawToken.startsWith(AGENT_TOKEN_PREFIX)) {
    next();
    return;
  }
  const parsed = parseApiClientToken(rawToken);
  if (!parsed) {
    fail(res, 401, 'AGENT_TOKEN_INVALID', 'The agent credential is invalid.');
    return;
  }
  const models = (req.app as unknown as { db?: { models?: Record<string, any> } }).db?.models;
  if (!models) {
    fail(res, 503, 'AGENT_AUTH_UNAVAILABLE', 'Agent authentication is temporarily unavailable.');
    return;
  }
  const client = await models?.ApiClient?.findOne({ clientId: parsed.clientId }).select('+secretHash');
  if (!client || client.status !== 'active' || !apiClientSecretsMatch(String(client.secretHash || ''), parsed.secret)) {
    fail(res, 401, 'AGENT_TOKEN_INVALID', 'The agent credential is invalid or revoked.');
    return;
  }
  if (client.expiresAt && new Date(client.expiresAt).getTime() <= Date.now()) {
    fail(res, 401, 'AGENT_TOKEN_EXPIRED', 'The agent credential has expired.');
    return;
  }

  const limit = Math.max(10, Math.min(600, Number(client.rateLimitPerMinute || 60)));
  const now = Date.now();
  const previous = rateWindows.get(parsed.clientId);
  const window = !previous || now - previous.startedAt >= 60_000 ? { startedAt: now, count: 0 } : previous;
  window.count += 1;
  rateWindows.set(parsed.clientId, window);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - window.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((window.startedAt + 60_000) / 1000)));
  if (window.count > limit) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((window.startedAt + 60_000 - now) / 1000))));
    fail(res, 429, 'AGENT_RATE_LIMITED', 'The agent request rate limit was exceeded.');
    return;
  }

  const user = await models?.User?.findById(client.userId);
  if (!user || (user.isActive && user.isActive !== 'yes')) {
    fail(res, 401, 'AGENT_OWNER_INACTIVE', 'The accountable user is unavailable or inactive.');
    return;
  }
  req.apiClient = toApiClientIdentity(client.toObject ? client.toObject() : client);
  req.user = user;
  await models.ApiClient.updateOne(
    { _id: client._id, status: 'active' },
    {
      $set: { lastUsedAt: new Date(), lastUsedIp: String(req.ip || ''), editDate: new Date() },
      $inc: { requestCount: 1 },
    },
  );
  next();
}

export function resetApiClientRateWindowsForTests(): void {
  rateWindows.clear();
}
