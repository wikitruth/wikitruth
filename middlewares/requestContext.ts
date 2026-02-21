// @ts-nocheck
'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

const KEY_PATH_PATTERNS = [/^\/home\/?$/, /^\/login\/?$/, /^\/api\/home\/?$/, /^\/app(\/|$)/];

function isKeyPath(pathname) {
  return KEY_PATH_PATTERNS.some(function (pattern) {
    return pattern.test(pathname || '');
  });
}

function normalizeRequestId(value) {
  if (!value) {
    return '';
  }

  const normalized = String(value).trim();
  if (normalized.length < 8 || normalized.length > 128) {
    return '';
  }
  return normalized;
}

module.exports = function requestContext(req, res, next) {
  const incomingRequestId = normalizeRequestId(req.header('x-request-id'));
  const requestId = incomingRequestId || crypto.randomUUID();
  const startedAt = Date.now();
  const path = req.originalUrl || req.path || '/';

  req.requestId = requestId;
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
