'use strict';

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

const API_ROUTE_PREFIX = /^\/api(\/|$)/;
const logger = require('../utils/logger') as {
  error: (event: string, fields: Record<string, unknown>) => void;
};

type PromiseLikeResult = {
  then?: unknown;
  catch?: (next: NextFunction) => unknown;
};

type RouteHandlerLike = (req: Request, res: Response, next: NextFunction) => unknown;

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

interface AppErrorLike {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
}

function isPromiseLike(value: unknown): value is PromiseLikeResult {
  const candidate = value as PromiseLikeResult;
  return typeof candidate?.then === 'function' && typeof candidate?.catch === 'function';
}

function wrapHandler(handler: unknown): unknown {
  if (typeof handler !== 'function') {
    return handler;
  }

  const typedHandler = handler as RouteHandlerLike;
  const wrappedHandler: RequestHandler = function (req, res, next) {
    try {
      const result = typedHandler(req, res, next);
      if (isPromiseLike(result)) {
        result.catch?.(next);
      }
    } catch (error) {
      next(error);
    }
  };

  return wrappedHandler;
}

function looksLikePathArgument(value: unknown): boolean {
  return typeof value === 'string' || value instanceof RegExp || Array.isArray(value);
}

function wrapAsyncRouter(router: Record<string, unknown>): Record<string, unknown> {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'] as const;

  methods.forEach(function (method) {
    const candidate = router[method];
    if (typeof candidate !== 'function') {
      return;
    }

    const original = (candidate as (...args: unknown[]) => unknown).bind(router);
    router[method] = function (...args: unknown[]) {
      const wrappedArgs = args.map(function (arg, index) {
        if (index === 0 && looksLikePathArgument(arg)) {
          return arg;
        }
        return wrapHandler(arg);
      });
      return original(...wrappedArgs);
    };
  });

  return router;
}

function normalizeError(error: AppErrorLike | null | undefined): NormalizedError {
  if (!error) {
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }

  const statusCandidate = Number(error.status ?? error.statusCode ?? 500);
  const status = Number.isFinite(statusCandidate) && statusCandidate >= 400 ? statusCandidate : 500;
  const code = error.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'API_ERROR');
  const message = status >= 500 ? 'Internal server error' : (error.message ?? 'Request failed');

  return {
    status: status,
    code: code,
    message: message,
    details: error.details,
  };
}

const apiErrorHandler: ErrorRequestHandler = function (err, req, res, next) {
  const requestPath = req.path || req.originalUrl || '';
  if (!API_ROUTE_PREFIX.test(requestPath)) {
    next(err);
    return;
  }

  const normalized = normalizeError(err as AppErrorLike);
  const requestId = (req as Request & { requestId?: string }).requestId ?? null;

  logger.error('api.error', {
    requestId: requestId,
    method: req.method,
    path: requestPath,
    statusCode: normalized.status,
    code: normalized.code,
    message: err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : 'unknown error',
  });

  const payload = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details ?? null,
      requestId: requestId,
    },
  };

  res.status(normalized.status).json(payload);
};

module.exports = {
  wrapAsyncRouter: wrapAsyncRouter,
  apiErrorHandler: apiErrorHandler,
};
