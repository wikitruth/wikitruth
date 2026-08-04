'use strict';

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { API_ERROR_CODES, type ApiErrorCode, isAppError } from '../types/errors';

import * as logger from '../utils/logger';

const API_ROUTE_PREFIX = /^\/api(\/|$)/;

type PromiseLikeResult = {
  then?: unknown;
  catch?: (next: NextFunction) => unknown;
};

type RouteHandlerLike = (req: Request, res: Response, next: NextFunction) => unknown;

interface NormalizedError {
  status: number;
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
}

interface AppErrorLike {
  status?: number;
  statusCode?: number;
  code?: ApiErrorCode | string;
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

function wrapAsyncRouter<T>(router: T): T {
  const target = router as unknown as Record<string, unknown>;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'] as const;

  methods.forEach(function (method) {
    const candidate = target[method];
    if (typeof candidate !== 'function') {
      return;
    }

    const original = (candidate as (...args: unknown[]) => unknown).bind(target);
    target[method] = function (...args: unknown[]) {
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
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  const statusCandidate = Number(error.status ?? error.statusCode ?? 500);
  const status = Number.isFinite(statusCandidate) && statusCandidate >= 400 ? statusCandidate : 500;
  const code = error.code ?? (status >= 500 ? API_ERROR_CODES.INTERNAL_ERROR : API_ERROR_CODES.API_ERROR);
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

  const normalized = normalizeError(isAppError(err) ? err : (err as AppErrorLike));
  const requestId = (req as Request & { requestId?: string }).requestId ?? null;

  logger.error('api.error', {
    requestId: requestId,
    method: req.method,
    path: requestPath,
    statusCode: normalized.status,
    code: normalized.code,
    message: err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : 'unknown error',
  });

  void import('../services/operationalTelemetryService.js')
    .then(({ recordOperationalEvent }) => recordOperationalEvent({
      kind: 'api_error',
      severity: normalized.status >= 500 ? 'error' : 'warning',
      source: 'express-api',
      code: normalized.code,
      message: err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : normalized.message,
      path: requestPath,
      requestId,
    }))
    .catch((telemetryError) => logger.error('operational.telemetry.persist_failed', {
      kind: 'api_error',
      errorType: telemetryError instanceof Error ? telemetryError.name : 'unknown',
    }));

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

const apiEnvelopeMiddleware: RequestHandler = function (req, res, next) {
  const originalJson = res.json.bind(res);
  const requestId = (req as Request & { requestId?: string }).requestId ?? null;

  res.json = function (payload: unknown) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const objectPayload = payload as Record<string, unknown>;

      if (typeof objectPayload.success === 'boolean') {
        return originalJson(payload);
      }

      if (res.statusCode >= 400) {
        const legacyMessage =
          typeof objectPayload.error === 'string'
            ? objectPayload.error
            : typeof objectPayload.message === 'string'
              ? objectPayload.message
              : 'Request failed';

        const normalizedError =
          objectPayload.error && typeof objectPayload.error === 'object'
            ? objectPayload.error
            : {
              code: API_ERROR_CODES.API_ERROR,
              message: legacyMessage,
              details: null,
              requestId: requestId,
            };

        return originalJson({
          success: false,
          ...objectPayload,
          error: normalizedError,
        });
      }

      return originalJson({
        success: true,
        ...objectPayload,
      });
    }

    if (res.statusCode >= 400) {
      return originalJson({
        success: false,
        error: {
          code: API_ERROR_CODES.API_ERROR,
          message: 'Request failed',
          details: payload ?? null,
          requestId: requestId,
        },
      });
    }

    return originalJson({
      success: true,
      data: payload ?? null,
    });
  } as typeof res.json;

  next();
};

export {
  wrapAsyncRouter,
  apiErrorHandler,
  apiEnvelopeMiddleware,
};
