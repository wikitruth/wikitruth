'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  cancelPrivacyRequest,
  consumePrivacyExport,
  createExportDownloadToken,
  createPrivacyRequest,
  listPrivacyRequests,
  type PrivacyRequestType,
} from '../../services/privacyRequestService';

function authenticatedUserId(req: WikitruthRequest, res: WikitruthResponse): string | null {
  const userId = String(req.user?._id || req.user?.id || '');
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return userId;
}

export = function (router: Router) {
  router.get('/requests', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const userId = authenticatedUserId(req, res); if (!userId) return;
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, requests: await listPrivacyRequests({ subjectUserId: userId }) });
  });

  router.post('/requests', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const userId = authenticatedUserId(req, res); if (!userId) return;
    const type = String(req.body?.type || '') as PrivacyRequestType;
    try {
      const privacyRequest = await createPrivacyRequest({
        type, userId, reason: req.body?.reason, actorUsername: String(req.user?.username || ''),
      });
      res.status(201).json({ success: true, request: privacyRequest });
    } catch (error) {
      res.status(409).json({ success: false, message: error instanceof Error ? error.message : 'Unable to create privacy request' });
    }
  });

  router.post('/requests/:id/cancel', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const userId = authenticatedUserId(req, res); if (!userId) return;
    try {
      const privacyRequest = await cancelPrivacyRequest(String(req.params.id || ''), userId, String(req.user?.username || ''));
      if (!privacyRequest) {
        res.status(404).json({ success: false, message: 'Privacy request not found' }); return;
      }
      res.json({ success: true, request: privacyRequest });
    } catch (error) {
      res.status(409).json({ success: false, message: error instanceof Error ? error.message : 'Unable to cancel privacy request' });
    }
  });

  router.post('/requests/:id/download-token', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const userId = authenticatedUserId(req, res); if (!userId) return;
    try {
      const authorization = await createExportDownloadToken(String(req.params.id || ''), userId);
      if (!authorization) {
        res.status(404).json({ success: false, message: 'Privacy request not found' }); return;
      }
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, authorization });
    } catch (error) {
      res.status(409).json({ success: false, message: error instanceof Error ? error.message : 'Export is not available' });
    }
  });

  router.post('/requests/:id/download', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const userId = authenticatedUserId(req, res); if (!userId) return;
    try {
      const result = await consumePrivacyExport(String(req.params.id || ''), {
        userId, actorUsername: String(req.user?.username || ''), token: String(req.body?.token || ''),
      });
      if (!result) {
        res.status(404).json({ success: false, message: 'Privacy request not found' }); return;
      }
      res.set({
        'Cache-Control': 'no-store, private', Pragma: 'no-cache',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Content-Type-Options': 'nosniff',
      });
      res.status(200).send(JSON.stringify(result.payload, null, 2));
    } catch (error) {
      res.status(403).json({ success: false, message: error instanceof Error ? error.message : 'Export authorization failed' });
    }
  });
};
