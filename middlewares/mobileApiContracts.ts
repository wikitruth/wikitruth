'use strict';

import type { Request, RequestHandler } from 'express';
import { API_ERROR_CODES } from '../types/errors';

interface MobileApiRuntimeConfig {
  rateLimitPerMinute?: number;
  rateLimitWindowMs?: number;
  deprecationSunset?: string;
  deprecationPolicyUrl?: string;
}

interface MobileApiContractOptions {
  rateLimitPerMinute: number;
  rateLimitWindowMs: number;
  deprecationSunset: string;
  deprecationPolicyUrl: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RequestWithContext extends Request {
  requestId?: string;
}

const DEFAULT_OPTIONS: MobileApiContractOptions = {
  rateLimitPerMinute: 240,
  rateLimitWindowMs: 60_000,
  deprecationSunset: '2028-12-31T23:59:59.000Z',
  deprecationPolicyUrl: 'https://wikitruth.net/docs/deprecations',
};

const PAGINATION_DEFAULTS: Record<string, number> = {
  '/home': 5,
  '/topics': 50,
  '/search': 20,
};

const rateLimitState = new Map<string, RateLimitBucket>();

function parsePositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function getRuntimeConfig(req: Request, base: MobileApiContractOptions): MobileApiContractOptions {
  const appConfig = (req.app as { config?: { mobileApi?: MobileApiRuntimeConfig } }).config?.mobileApi;

  return {
    rateLimitPerMinute: parsePositiveInteger(appConfig?.rateLimitPerMinute, base.rateLimitPerMinute, 10_000),
    rateLimitWindowMs: parsePositiveInteger(appConfig?.rateLimitWindowMs, base.rateLimitWindowMs, 3_600_000),
    deprecationSunset: String(appConfig?.deprecationSunset || base.deprecationSunset),
    deprecationPolicyUrl: String(appConfig?.deprecationPolicyUrl || base.deprecationPolicyUrl),
  };
}

function cleanupExpiredBuckets(now: number) {
  if (rateLimitState.size < 2_000) {
    return;
  }

  rateLimitState.forEach(function (bucket, key) {
    if (bucket.resetAt <= now) {
      rateLimitState.delete(key);
    }
  });
}

function buildRateLimitKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const clientVersion = String(req.header('x-client-version') || '');
  const clientPlatform = String(req.header('x-client-platform') || '');
  return `${ip}:${clientPlatform}:${clientVersion}`;
}

function applyPaginationContract(req: Request, payload: unknown) {
  if (req.method !== 'GET') {
    return payload;
  }

  const defaultLimit = PAGINATION_DEFAULTS[req.path];
  if (!defaultLimit || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const objectPayload = payload as Record<string, unknown>;
  if (objectPayload.pagination && typeof objectPayload.pagination === 'object') {
    return payload;
  }

  const limit = parsePositiveInteger(req.query.limit, defaultLimit, 100);
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim() ? req.query.cursor.trim() : null;
  const nextCursor = typeof objectPayload.nextCursor === 'string' ? objectPayload.nextCursor : null;

  return {
    ...objectPayload,
    pagination: {
      limit: limit,
      cursor: cursor,
      nextCursor: nextCursor,
    },
  };
}

function setContractHeaders(req: Request, res: Parameters<RequestHandler>[1], options: MobileApiContractOptions, remaining: number, resetAt: number) {
  const resetInSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  res.setHeader('RateLimit-Limit', String(options.rateLimitPerMinute));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining)));
  res.setHeader('RateLimit-Reset', String(resetInSeconds));

  // Keep legacy-compatible prefixed headers for clients that have not moved to RFC names.
  res.setHeader('X-RateLimit-Limit', String(options.rateLimitPerMinute));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));

  res.setHeader('Deprecation', 'false');
  res.setHeader('Sunset', new Date(options.deprecationSunset).toUTCString());
  res.setHeader('Link', `<${options.deprecationPolicyUrl}>; rel="deprecation"`);
  res.setHeader('X-API-Contract', 'mobile-mvp-v1');

  const mobilePlatform = String(req.header('x-client-platform') || '').trim();
  const mobileVersion = String(req.header('x-client-version') || '').trim();
  const mobileBuild = String(req.header('x-client-build') || '').trim();
  if (mobilePlatform || mobileVersion || mobileBuild) {
    res.setHeader('X-Mobile-Client', [mobilePlatform, mobileVersion, mobileBuild].filter(Boolean).join('/'));
  }
}

function createMobileApiContractMiddleware(options?: Partial<MobileApiContractOptions>): RequestHandler {
  const merged: MobileApiContractOptions = {
    ...DEFAULT_OPTIONS,
    ...(options || {}),
  };

  return function mobileApiContractMiddleware(req, res, next) {
    const runtime = getRuntimeConfig(req, merged);
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const rateLimitKey = buildRateLimitKey(req);
    const currentBucket = rateLimitState.get(rateLimitKey);
    const activeBucket: RateLimitBucket =
      currentBucket && currentBucket.resetAt > now
        ? currentBucket
        : {
          count: 0,
          resetAt: now + runtime.rateLimitWindowMs,
        };

    activeBucket.count += 1;
    rateLimitState.set(rateLimitKey, activeBucket);

    const remaining = runtime.rateLimitPerMinute - activeBucket.count;
    setContractHeaders(req, res, runtime, remaining, activeBucket.resetAt);

    if (activeBucket.count > runtime.rateLimitPerMinute) {
      const requestId = (req as RequestWithContext).requestId || null;
      res.status(429).json({
        error: {
          code: API_ERROR_CODES.RATE_LIMITED,
          message: 'Rate limit exceeded',
          details: {
            limit: runtime.rateLimitPerMinute,
            resetAt: new Date(activeBucket.resetAt).toISOString(),
          },
          requestId: requestId,
        },
      });
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = function (payload: unknown) {
      const withPagination = applyPaginationContract(req, payload);
      return originalJson(withPagination);
    };

    next();
  };
}

const mobileApiContractMiddleware = createMobileApiContractMiddleware();

module.exports = {
  createMobileApiContractMiddleware: createMobileApiContractMiddleware,
  mobileApiContractMiddleware: mobileApiContractMiddleware,
};
