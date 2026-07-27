'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { buildPublicTruthSummary } from '../../services/truthSummaryService';

export = function (router: Router) {
  router.get('/:objectName/:id/truth-summary', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const includePending = Boolean(req.user?.canPlayRoleOf?.('reviewer') || req.user?.roles?.admin);
    const summary = await buildPublicTruthSummary({
      objectName: String(req.params.objectName || ''),
      objectId: String(req.params.id || ''),
      includePending,
    });
    if (!summary) {
      res.status(404).json({ success: false, message: 'Truth summary not found' });
      return;
    }
    res.json({ success: true, summary });
  });
};
