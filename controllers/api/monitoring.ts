'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const logger = require('../../utils/logger') as {
  error: (event: string, fields: Record<string, unknown>) => void;
};

type MonitoringPayload = {
  type?: string;
  message?: string;
  stack?: string;
  path?: string;
  userAgent?: string;
  timestamp?: string;
};

module.exports = function (router: Router) {
  router.post('/errors', function (req: WikitruthRequest, res: WikitruthResponse) {
    const bodyCandidate = req.body;
    const body: MonitoringPayload =
      bodyCandidate && typeof bodyCandidate === 'object'
        ? (bodyCandidate as MonitoringPayload)
        : {};
    const requestId = req.requestId || null;

    logger.error('client.runtime.error', {
      requestId: requestId,
      source: 'react-client',
      eventType: body.type || 'unknown',
      message: body.message || 'unknown',
      stack: body.stack || null,
      path: body.path || req.path,
      userAgent: body.userAgent || req.get('user-agent') || null,
      timestamp: body.timestamp || new Date().toISOString(),
    });

    res.status(202).json({ success: true });
  });
};
