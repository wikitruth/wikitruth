'use strict';

import type { Request, RequestHandler } from 'express';
const crypto = require('crypto') as typeof import('crypto');
const logger = require('../utils/logger') as {
  info: (event: string, fields: Record<string, unknown>) => void;
};

const KEY_PATH_PATTERNS = [/^\/home\/?$/, /^\/login\/?$/, /^\/api\/home\/?$/, /^\/app(\/|$)/];

interface RequestWithContext extends Request {
  requestId?: string;
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
  requestWithContext.requestId = requestId;
  res.locals.requestId = requestId;
  res.set('X-Request-Id', requestId);

  if (isKeyPath(path) || path.startsWith('/api/')) {
    logger.info('request.start', {
      requestId: requestId,
      method: req.method,
      path: path,
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
      });
    }
  });

  next();
};

module.exports = requestContext;
