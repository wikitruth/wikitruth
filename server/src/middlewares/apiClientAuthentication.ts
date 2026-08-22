'use strict';

import type { NextFunction, Request, Response } from 'express';
import {
  AGENT_TOKEN_PREFIX,
  apiClientSecretsMatch,
  parseApiClientToken,
  toApiClientIdentity,
} from '../services/apiClientService';
import {
  consumeAgentRateLimit,
  queueApiClientUsage,
  resetAgentUsageForTests,
} from '../services/agentUsageService';

type CachedCredential = { version: string; expiresAt: number; client: Record<string, any> };
let credentialCaches = new WeakMap<object, Map<string, CachedCredential>>();
const CREDENTIAL_CACHE_MS = 15_000;

function bearerToken(req: Request): string | null {
  const authorization = String(req.headers.authorization || '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1] ? match[1].trim() : null;
}

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

async function selectedRecord(query: any): Promise<Record<string, any> | null> {
  const selected = query && typeof query.lean === 'function' ? await query.lean() : await query;
  if (!selected) return null;
  return selected.toObject ? selected.toObject() : selected;
}

async function activeClient(models: Record<string, any>, clientId: string): Promise<Record<string, any> | null> {
  let credentialCache = credentialCaches.get(models.ApiClient as object);
  if (!credentialCache) {
    credentialCache = new Map<string, CachedCredential>();
    credentialCaches.set(models.ApiClient as object, credentialCache);
  }
  const probeQuery = models.ApiClient.findOne({ clientId }).select('status expiresAt editDate');
  const probe = await selectedRecord(probeQuery);
  if (!probe || probe.status !== 'active') {
    credentialCache.delete(clientId);
    return null;
  }
  const version = `${String(probe._id || '')}:${new Date(probe.editDate || 0).getTime()}`;
  const cached = credentialCache.get(clientId);
  if (cached && cached.version === version && cached.expiresAt > Date.now()) {
    return { ...cached.client, status: probe.status, expiresAt: probe.expiresAt, editDate: probe.editDate };
  }
  const client = await selectedRecord(models.ApiClient.findOne({ clientId }).select('+secretHash'));
  if (!client || client.status !== 'active') return null;
  credentialCache.set(clientId, { version, expiresAt: Date.now() + CREDENTIAL_CACHE_MS, client });
  return client;
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
  const client = await activeClient(models, parsed.clientId);
  if (!client || client.status !== 'active' || !apiClientSecretsMatch(String(client.secretHash || ''), parsed.secret)) {
    fail(res, 401, 'AGENT_TOKEN_INVALID', 'The agent credential is invalid or revoked.');
    return;
  }
  if (client.expiresAt && new Date(client.expiresAt).getTime() <= Date.now()) {
    fail(res, 401, 'AGENT_TOKEN_EXPIRED', 'The agent credential has expired.');
    return;
  }

  const limit = Math.max(10, Math.min(600, Number(client.rateLimitPerMinute || 60)));
  let rate;
  try {
    rate = await consumeAgentRateLimit({
      models, apiClientId: String(client._id || ''), limit, ip: String(req.ip || ''),
    });
  } catch (error) {
    console.error('Agent rate-limit check failed:', error);
    fail(res, 503, 'AGENT_RATE_LIMIT_UNAVAILABLE', 'Agent rate limiting is temporarily unavailable.');
    return;
  }
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rate.resetAt.getTime() / 1000)));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000))));
    fail(res, 429, 'AGENT_RATE_LIMITED', 'The agent request rate limit was exceeded.');
    return;
  }

  const user = await models?.User?.findById(client.userId);
  if (!user || (user.isActive && user.isActive !== 'yes')) {
    fail(res, 401, 'AGENT_OWNER_INACTIVE', 'The accountable user is unavailable or inactive.');
    return;
  }
  req.apiClient = toApiClientIdentity(client);
  req.user = user;
  queueApiClientUsage(models, String(client._id || ''), String(req.ip || ''));
  next();
}

export function resetApiClientRateWindowsForTests(): void {
  credentialCaches = new WeakMap<object, Map<string, CachedCredential>>();
  resetAgentUsageForTests();
}
