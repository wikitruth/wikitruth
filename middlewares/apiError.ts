// @ts-nocheck
'use strict';

const API_ROUTE_PREFIX = /^\/api(\/|$)/;
const logger = require('../utils/logger');

function isPromiseLike(value) {
  return value && typeof value.then === 'function' && typeof value.catch === 'function';
}

function wrapHandler(handler) {
  if (typeof handler !== 'function') {
    return handler;
  }

  return function wrappedHandler(req, res, next) {
    try {
      const result = handler(req, res, next);
      if (isPromiseLike(result)) {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

function looksLikePathArgument(value) {
  return typeof value === 'string' || value instanceof RegExp || Array.isArray(value);
}

function wrapAsyncRouter(router) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];

  methods.forEach(function (method) {
    if (typeof router[method] !== 'function') {
      return;
    }

    const original = router[method].bind(router);
    router[method] = function () {
      const args = Array.prototype.slice.call(arguments);
      const wrappedArgs = args.map(function (arg, index) {
        if (index === 0 && looksLikePathArgument(arg)) {
          return arg;
        }
        return wrapHandler(arg);
      });
      return original.apply(null, wrappedArgs);
    };
  });

  return router;
}

function normalizeError(error) {
  if (!error) {
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }

  const statusCandidate = Number(error.status || error.statusCode || 500);
  const status = Number.isFinite(statusCandidate) && statusCandidate >= 400 ? statusCandidate : 500;
  const code = error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'API_ERROR');
  const message = status >= 500 ? 'Internal server error' : error.message || 'Request failed';

  return {
    status: status,
    code: code,
    message: message,
    details: error.details,
  };
}

function apiErrorHandler(err, req, res, next) {
  const requestPath = (req && (req.path || req.originalUrl)) || '';
  if (!API_ROUTE_PREFIX.test(requestPath)) {
    return next(err);
  }

  const normalized = normalizeError(err);
  logger.error('api.error', {
    requestId: req.requestId || null,
    method: req.method,
    path: requestPath,
    statusCode: normalized.status,
    code: normalized.code,
    message: err && err.message ? err.message : 'unknown error',
  });
  const payload = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details || null,
      requestId: req.requestId || null,
    },
  };

  return res.status(normalized.status).json(payload);
}

module.exports = {
  wrapAsyncRouter: wrapAsyncRouter,
  apiErrorHandler: apiErrorHandler,
};
