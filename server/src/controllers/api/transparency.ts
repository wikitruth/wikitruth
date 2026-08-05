'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { getCachedPublicTrustDashboard } from '../../services/publicTrustService';
import * as logger from '../../utils/logger';

export = function (router: Router) {
  router.get('/trust', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const dashboard = await getCachedPublicTrustDashboard();
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
      res.setHeader('Vary', 'Host');
      res.json({ success: true, dashboard });
    } catch (error) {
      logger.error('public.transparency.unavailable', {
        requestId: req.requestId || null,
        errorType: error instanceof Error ? error.name : 'unknown',
      });
      res.status(503).json({ success: false, message: 'Public transparency data is temporarily unavailable' });
    }
  });
};
