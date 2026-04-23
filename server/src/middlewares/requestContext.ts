'use strict';

import type { Request, RequestHandler } from 'express';
import * as logger from '../utils/logger';
import cryptoMod from 'crypto';
const crypto = cryptoMod as unknown as typeof import('crypto');
const KEY_PATH_PATTERNS = [/^\/$/, /^\/home\/?$/, /^\/login\/?$/, /^\/api\/home\/?$/, /^\/app(\/|$)/, /^\/legacy(\/|$)/];

interface RequestWithContext extends Request {
  requestId?: string;
  clientTelemetry?: {
    platform: string | null;
    version: string | null;
    build: string | null;
  };
}

function isKeyPath(pathname: string): boolean {
  return KEY_PATH_PATTERNS.some(function (pattern) {
    return pattern.test(pathname);
  });
}

function normalizeRequestId(value: unknown): string {
  if (!value) {
    return '';
  }

  const normalized = String(value).trim();
  if (normalized.length < 8 || normalized.length > 128) {
    return '';
  }

  return normalized;
}

const requestContext: RequestHandler = function (req, res, next) {
  const incomingRequestId = normalizeRequestId(req.header('x-request-id'));
  const requestId = incomingRequestId || crypto.randomUUID();
  const startedAt = Date.now();
  const path = req.originalUrl || req.path || '/';

  const requestWithContext = req as RequestWithContext;
  const clientTelemetry = {
    platform: String(req.header('x-client-platform') || '').trim() || null,
    version: String(req.header('x-client-version') || '').trim() || null,
    build: String(req.header('x-client-build') || '').trim() || null,
  };
  requestWithContext.requestId = requestId;
  requestWithContext.clientTelemetry = clientTelemetry;
  res.locals.requestId = requestId;
  res.locals.clientTelemetry = clientTelemetry;
  res.set('X-Request-Id', requestId);

  if (isKeyPath(path) || path.startsWith('/api/')) {
    logger.info('request.start', {
      requestId: requestId,
      method: req.method,
      path: path,
      clientPlatform: clientTelemetry.platform,
      clientVersion: clientTelemetry.version,
      clientBuild: clientTelemetry.build,
    });
  }

  res.on('finish', function () {
    if (isKeyPath(path) || path.startsWith('/api/')) {
      logger.info('request.finish', {
        requestId: requestId,
        method: req.method,
        path: path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        clientPlatform: clientTelemetry.platform,
        clientVersion: clientTelemetry.version,
        clientBuild: clientTelemetry.build,
      });
    }
  });

  next();
};

export default requestContext;
