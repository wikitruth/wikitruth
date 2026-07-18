'use strict';

import type { RequestHandler } from 'express';

const SUPPORTED_API_VERSION = '1';

export const apiVersionPolicy: RequestHandler = function (req, res, next) {
  const requestedVersion = String(req.get('accept-version') || req.get('x-api-version') || '').trim();
  const explicitVersion = /^\/api\/v1(?:\/|$)/.test(req.originalUrl || '');
  const stability = explicitVersion ? 'stable' : 'compatibility';

  res.setHeader('API-Version', SUPPORTED_API_VERSION);
  res.setHeader('X-API-Version', SUPPORTED_API_VERSION);
  res.setHeader('X-API-Stability', stability);
  res.setHeader('Vary', 'Accept-Version');

  if (requestedVersion && requestedVersion !== SUPPORTED_API_VERSION) {
    res.status(406).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `API version ${requestedVersion} is not supported`,
        details: { requestedVersion, supportedVersions: [SUPPORTED_API_VERSION] },
        requestId: (req as typeof req & { requestId?: string }).requestId || null,
      },
    });
    return;
  }
  next();
};
