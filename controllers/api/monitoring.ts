'use strict';

const logger = require('../../utils/logger') as {
  error: (event: string, fields: Record<string, unknown>) => void;
};

module.exports = function (router) {
  router.post('/errors', function (req, res) {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
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
