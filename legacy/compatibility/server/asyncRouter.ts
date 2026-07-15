'use strict';

import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
  type Router,
} from 'express';

type LegacyRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

export function wrapLegacyRequestHandler(handler: LegacyRequestHandler): RequestHandler {
  return function safeLegacyRequest(req, res, next) {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

export function createAsyncSafeLegacyRouter(): Router {
  const router = express.Router();
  const methods = ['get', 'post'] as const;
  type RouteRegistrar = (routePath: string, ...handlers: RequestHandler[]) => Router;
  const registrars = router as unknown as Record<(typeof methods)[number], RouteRegistrar>;

  methods.forEach(function(method) {
    const register = registrars[method].bind(router);
    registrars[method] = function registerSafeLegacyRoute(routePath, ...handlers) {
      return register(routePath, ...handlers.map(wrapLegacyRequestHandler));
    };
  });

  return router;
}
